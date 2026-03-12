import os
import re
import math
import numpy as np
from collections import Counter
from dotenv import load_dotenv
from pypdf import PdfReader
from firebase_client import get_db, verify_token
from groq import Groq

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env. Get a free key at console.groq.com")

groq_client = Groq(api_key=GROQ_API_KEY)

# Current supported Groq model — context is capped at 4000 chars to stay within TPM limits
MODEL = "llama-3.1-8b-instant"

# Hard cap on context characters sent to Groq (~4 chars ≈ 1 token → 4000 chars ≈ 1000 tokens)
MAX_CONTEXT_CHARS = 4000


def tokenize(text: str) -> list:
    """Simple word tokenizer — lowercase, letters only."""
    return re.findall(r"[a-z]+", text.lower())


def bm25_score(query_tokens: list, doc_tokens: list, avg_dl: float,
               idf: dict, k1: float = 1.5, b: float = 0.75) -> float:
    """BM25 relevance score."""
    tf = Counter(doc_tokens)
    dl = len(doc_tokens)
    score = 0.0
    for term in query_tokens:
        if term in idf and term in tf:
            f = tf[term]
            score += idf[term] * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avg_dl))
    return score


def split_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list:
    """Simple sliding-window text chunker."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return [c.strip() for c in chunks if c.strip()]


def retrieve_top_chunks(question: str, chunks: list, top_k: int = 4) -> list:
    """Retrieve most relevant chunks using BM25."""
    q_tokens = tokenize(question)
    tokenized = [tokenize(c) for c in chunks]

    N = len(chunks)
    avg_dl = sum(len(t) for t in tokenized) / N if N > 0 else 1

    idf = {}
    for term in set(q_tokens):
        df = sum(1 for t in tokenized if term in t)
        idf[term] = math.log((N - df + 0.5) / (df + 0.5) + 1)

    scores = [bm25_score(q_tokens, t, avg_dl, idf) for t in tokenized]
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
    return [chunks[i] for i in top_indices if scores[i] > 0]


def cap_context(text: str, max_chars: int = MAX_CONTEXT_CHARS) -> str:
    """Hard-cap context to avoid exceeding model token limits."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[...content truncated to fit model limits...]"


SUMMARY_KEYWORDS = {
    "summarize", "summary", "overview", "outline", "gist", "brief",
    "what is this", "what does this", "what is the pdf", "about this pdf",
    "tell me about", "describe", "main points", "key points",
    "what are the", "explain the", "overall", "in general", "content of",
    "what's in", "whats in", "who is", "who wrote", "who are",
    "what topics", "what information", "what does it say",
    "give me", "show me", "list the",
}

def is_summary_query(question: str) -> bool:
    q = question.lower()
    return any(kw in q for kw in SUMMARY_KEYWORDS)


DIAGRAM_KEYWORDS = {
    "diagram", "flowchart", "flow chart", "mind map", "mindmap",
    "chart", "visualize", "visualise", "visualization", "visualisation",
    "timeline", "sequence diagram", "org chart", "tree", "graph",
    "draw", "sketch", "map out", "show as diagram", "create a diagram",
    "make a diagram", "generate diagram", "mermaid",
}

def is_diagram_query(question: str) -> bool:
    q = question.lower()
    return any(kw in q for kw in DIAGRAM_KEYWORDS)


def get_summary_context(chunks: list, max_chunks: int = 6) -> str:
    """Sample chunks evenly across the document."""
    if len(chunks) <= max_chunks:
        selected = chunks
    else:
        step = len(chunks) // max_chunks
        selected = [chunks[i] for i in range(0, len(chunks), step)][:max_chunks]
    return "\n\n".join([f"[Section {i+1}]\n{c}" for i, c in enumerate(selected)])


def index_pdf(file, filename: str, project_id: str, auth_token: str):
    uid = verify_token(auth_token)
    file.seek(0)

    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text

    if not text.strip():
        raise ValueError("Could not extract text from PDF. It may be scanned/image-based.")

    chunks = split_text(text, chunk_size=800, overlap=100)

    pdf_docs_ref = get_db().child(f"pdf_docs/{uid}/{project_id}")
    for chunk in chunks:
        pdf_docs_ref.push({
            "content": chunk,
            "filename": filename,
        })

    print(f"Indexed {len(chunks)} chunks for '{filename}' in project {project_id}")


def ask_pdf(question: str, project_id: str, auth_token: str, history: list = [], owner_uid: str = None, allowed_pdfs: list = []) -> str:
    uid = verify_token(auth_token)
    target_uid = owner_uid if owner_uid else uid

    docs_ref = get_db().child(f"pdf_docs/{target_uid}/{project_id}")
    snapshot = docs_ref.get()

    if not snapshot:
        return "No PDFs found for this project. Please upload a PDF first."

    from collections import defaultdict
    by_file = defaultdict(list)
    for data in snapshot.values():
        if data.get("content"):
            fn = data.get("filename", "unknown")
            if allowed_pdfs and fn not in allowed_pdfs:
                continue
            by_file[fn].append(data["content"])

    all_chunks = [c for chunks in by_file.values() for c in chunks]
    filenames = list(by_file.keys())

    if not all_chunks:
        return "No text content found in the uploaded PDFs."

    # --- Summary / overview request ---
    if is_summary_query(question):
        per_file_context = []
        for fname, chunks in by_file.items():
            # Max 6 chunks per file to stay under token limits
            max_c = 6
            if len(chunks) <= max_c:
                selected = chunks
            else:
                step = len(chunks) // max_c
                selected = [chunks[i] for i in range(0, len(chunks), step)][:max_c]
            joined = "\n\n".join([f"  [{i+1}] {c}" for i, c in enumerate(selected)])
            per_file_context.append(f"=== PDF: {fname} ===\n{joined}")

        full_context = cap_context("\n\n".join(per_file_context))
        multi = len(by_file) > 1

        prompt = f"""You are an expert document analyst. The user has {len(by_file)} PDF(s).

User request: {question}

Instructions:
- {("Provide a SEPARATE summary for EACH PDF." if multi else "Provide a comprehensive summary of the PDF.")}
- Extract actual content: names, skills, dates, facts, findings.
- Use headers and bullet points.

Document content:
{full_context}

{"Summary for each PDF:" if multi else "Summary:"}"""

        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1200,
        )
        return response.choices[0].message.content

    # --- Diagram request ---
    if is_diagram_query(question):
        context = cap_context(get_summary_context(all_chunks, max_chunks=6))
        prompt = f"""You are an expert at creating Mermaid.js diagrams.

The user wants: "{question}"
Documents: {', '.join(filenames)}

Instructions:
- Generate valid Mermaid.js syntax.
- Choose the best diagram type (flowchart TD, graph LR, mindmap, timeline etc).
- Keep node labels short (max 5 words each).
- Output ONLY the mermaid code block. Nothing else.
- Format: ```mermaid\n<diagram code>\n```

Document content:
{context}

Mermaid diagram:"""

        response = groq_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=700,
        )
        return response.choices[0].message.content

    # --- Specific question: BM25 retrieval ---
    top_chunks = retrieve_top_chunks(question, all_chunks, top_k=4)

    if not top_chunks:
        top_chunks = all_chunks[:3]

    context = cap_context("\n\n".join([f"Excerpt:\n{chunk}" for chunk in top_chunks]))

    prompt = f"""You are a document assistant for '{', '.join(filenames)}'.

Base your answer strictly on the excerpts below. Be specific (names, dates, numbers).
Only say info is unavailable if it's genuinely absent from ALL excerpts.

Document excerpts:
{context}

Question: {question}
Answer:"""

    groq_messages = [
        {"role": "system", "content": f"You are a helpful PDF assistant for: {', '.join(filenames)}. Answer based on document context only."}
    ]
    # Last 3 turns of history, each capped at 300 chars to save tokens
    for h in history[-3:]:
        content = h["content"]
        if len(content) > 300:
            content = content[:300] + "..."
        groq_messages.append({"role": h["role"], "content": content})

    groq_messages.append({"role": "user", "content": prompt})

    response = groq_client.chat.completions.create(
        model=MODEL,
        messages=groq_messages,
        temperature=0.2,
        max_tokens=900,
    )
    return response.choices[0].message.content
