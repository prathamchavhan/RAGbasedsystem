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


def tokenize(text: str) -> list:
    """Simple word tokenizer — lowercase, letters only."""
    return re.findall(r"[a-z]+", text.lower())


def bm25_score(query_tokens: list, doc_tokens: list, avg_dl: float,
               idf: dict, k1: float = 1.5, b: float = 0.75) -> float:
    """BM25 relevance score — better than simple TF-IDF."""
    tf = Counter(doc_tokens)
    dl = len(doc_tokens)
    score = 0.0
    for term in query_tokens:
        if term in idf and term in tf:
            f = tf[term]
            score += idf[term] * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avg_dl))
    return score


def split_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list:
    """Simple sliding-window text chunker — no external deps."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return [c.strip() for c in chunks if c.strip()]

def retrieve_top_chunks(question: str, chunks: list, top_k: int = 8) -> list:
    """Retrieve most relevant chunks using BM25."""
    q_tokens = tokenize(question)
    tokenized = [tokenize(c) for c in chunks]

    N = len(chunks)
    avg_dl = sum(len(t) for t in tokenized) / N if N > 0 else 1

    # Compute IDF for query terms
    idf = {}
    for term in set(q_tokens):
        df = sum(1 for t in tokenized if term in t)
        idf[term] = math.log((N - df + 0.5) / (df + 0.5) + 1)

    scores = [bm25_score(q_tokens, t, avg_dl, idf) for t in tokenized]
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
    return [chunks[i] for i in top_indices if scores[i] > 0]


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
    """Detect if the user is asking for a summary or overview."""
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
    """Detect if the user wants a diagram/chart."""
    q = question.lower()
    return any(kw in q for kw in DIAGRAM_KEYWORDS)


def get_summary_context(chunks: list, max_chunks: int = 20) -> str:
    """Sample chunks evenly across the document for a full summary."""
    if len(chunks) <= max_chunks:
        selected = chunks
    else:
        # Pick evenly spaced chunks to cover the whole document
        step = len(chunks) // max_chunks
        selected = [chunks[i] for i in range(0, len(chunks), step)][:max_chunks]
    return "\n\n".join([f"[Section {i+1}]\n{c}" for i, c in enumerate(selected)])


def index_pdf(file, filename: str, project_id: str, auth_token: str):
    uid = verify_token(auth_token)
    file.seek(0)

    # Extract text from PDF
    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text

    if not text.strip():
        raise ValueError("Could not extract text from PDF. It may be scanned/image-based.")

    # Split into chunks
    chunks = split_text(text, chunk_size=800, overlap=100)

    # Store chunks in Realtime Database
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

    # Fetch all chunks for this project
    docs_ref = get_db().child(f"pdf_docs/{target_uid}/{project_id}")
    snapshot = docs_ref.get()

    if not snapshot:
        return "No PDFs found for this project. Please upload a PDF first."

    # Group chunks by filename so we know what files are indexed
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
        # Build per-PDF context — each file gets its own clearly labelled section
        per_file_context = []
        for fname, chunks in by_file.items():
            # Sample evenly across the file, up to 25 chunks for richer detail
            max_c = 25
            if len(chunks) <= max_c:
                selected = chunks
            else:
                step = len(chunks) // max_c
                selected = [chunks[i] for i in range(0, len(chunks), step)][:max_c]
            joined = "\n\n".join([f"  [{i+1}] {c}" for i, c in enumerate(selected)])
            per_file_context.append(f"=== PDF: {fname} ===\n{joined}")

        full_context = "\n\n".join(per_file_context)

        multi = len(by_file) > 1
        prompt = f"""You are an expert document analyst. The user has {len(by_file)} PDF(s) in this project.

User request: {question}

CRITICAL INSTRUCTIONS:
- Read ALL the document sections below very carefully.
- {"Provide a SEPARATE, detailed summary for EACH PDF." if multi else "Provide a comprehensive summary of the PDF."}
- Extract the ACTUAL content — names, skills, dates, facts, findings, conclusions — whatever is there.
- Do NOT say information is missing. All content is provided below — report what you find.
- For resumes: name, contact, skills, work experience (company/role/dates), education, projects, certifications.
- For reports/docs: topic, key findings, conclusions, data, recommendations.
- Use headers and bullet points for clarity.
{"- Start each PDF summary with a bold header like: ## 📄 " + " / ## 📄 ".join(filenames) if multi else ""}

Document content:
{full_context}

{"Detailed summary for each PDF:" if multi else "Detailed summary:"}"""

        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3000,
        )
        return response.choices[0].message.content

    # --- Diagram request ---
    if is_diagram_query(question):
        # Give a wide context sample for diagram generation
        context = get_summary_context(all_chunks, max_chunks=20)
        prompt = f"""You are an expert at creating Mermaid.js diagrams from document content.

The user wants a diagram based on: "{question}"
Documents: {', '.join(filenames)}

INSTRUCTIONS:
- Generate valid Mermaid.js syntax that visualizes the content.
- Choose the best diagram type based on the request:
  * Process/steps → flowchart TD
  * People/structure → graph TD or mindmap
  * Time-based → timeline
  * Relationships → graph LR
  * Skills/topics → mindmap
- Keep node labels short (max 5 words each).
- Use realistic content extracted from the document below.
- Output ONLY the mermaid code block, nothing else before or after.
- Format: ```mermaid\n<diagram code>\n```

Document content:
{context}

Mermaid diagram:"""

        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024,
        )
        return response.choices[0].message.content

    # --- Specific question: use BM25 retrieval ---
    top_chunks = retrieve_top_chunks(question, all_chunks, top_k=8)

    if not top_chunks:
        # Fallback: use first few chunks if BM25 finds nothing
        top_chunks = all_chunks[:5]

    context = "\n\n".join([f"Excerpt:\n{chunk}" for chunk in top_chunks])

    prompt = f"""You are a document analysis assistant. Read the excerpts below from '{', '.join(filenames)}' and answer the question.

IMPORTANT: Base your answer strictly on what is written in the excerpts. 
If this is a resume/CV, describe the person's actual skills, experience, and education found in the text.
If you find relevant information, report it in detail with specifics (names, dates, numbers, etc.).
Only say information is unavailable if it is genuinely absent from ALL excerpts.

Document excerpts:
{context}

Question: {question}
Detailed answer:"""

    # Build Groq messages with conversation history for context
    groq_messages = [
        {"role": "system", "content": f"You are a helpful PDF assistant for document(s): {', '.join(filenames)}. Answer questions based on the provided document context. Be detailed and helpful."}
    ]
    # Add last 6 turns of history for context (without the document context to save tokens)
    for h in history[-6:]:
        groq_messages.append({"role": h["role"], "content": h["content"]})
    # Add current question with retrieved context
    groq_messages.append({"role": "user", "content": prompt})

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=groq_messages,
        temperature=0.2,
        max_tokens=1536,
    )
    return response.choices[0].message.content
