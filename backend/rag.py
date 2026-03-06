import os
import numpy as np
from dotenv import load_dotenv
from pypdf import PdfReader
from firebase_client import db, bucket, verify_token
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import (
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=GEMINI_API_KEY
)

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.2
)


def cosine_similarity(vec_a: list, vec_b: list) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def index_pdf(file, filename: str, project_id: str, auth_token: str):
    uid = verify_token(auth_token)

    file_bytes = file.read()
    file.seek(0)

    # Upload PDF to Firebase Storage
    storage_path = f"{uid}/{project_id}/{filename}"
    blob = bucket.blob(storage_path)
    blob.upload_from_string(file_bytes, content_type="application/pdf")
    print(f"Uploaded {filename} to Firebase Storage at {storage_path}")

    # Extract text from PDF
    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_text(text)

    # Store chunks + embeddings in Firestore
    pdf_docs_ref = db.collection("pdf_docs")
    for chunk in chunks:
        vector = embeddings.embed_query(chunk)
        pdf_docs_ref.add({
            "content": chunk,
            "embedding": vector,
            "filename": filename,
            "project_id": project_id,
            "user_id": uid,
        })

    print(f"Indexed {len(chunks)} chunks for project {project_id}")


def ask_pdf(question: str, project_id: str, auth_token: str) -> str:
    uid = verify_token(auth_token)

    query_vector = embeddings.embed_query(question)

    # Fetch all docs for this project (Firestore has no native vector search)
    docs_ref = db.collection("pdf_docs") \
        .where("project_id", "==", project_id) \
        .where("user_id", "==", uid)

    docs = docs_ref.stream()

    scored = []
    for doc in docs:
        data = doc.to_dict()
        emb = data.get("embedding", [])
        if emb:
            score = cosine_similarity(query_vector, emb)
            scored.append((score, data["content"]))

    if not scored:
        return "No information found in the project's PDFs."

    # Top 10 most similar chunks
    scored.sort(key=lambda x: x[0], reverse=True)
    top_chunks = scored[:10]

    context = "\n\n".join([f"Document excerpt:\n{content}" for _, content in top_chunks])

    prompt = f"""
You are an intelligent assistant analyzing documents provided by the user.
Answer the user's question based ONLY on the context excerpts below.
If the question asks for a summary or general information about the PDFs, provide it based on the excerpts available.
If the answer is truly not present in the context, say: "I couldn't find the answer to that in the provided PDFs."

Context Excerpts:
{context}

User's Question:
{question}
"""

    response = llm.invoke(prompt)
    return response.content
