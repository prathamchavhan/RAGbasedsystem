import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


from pypdf import PdfReader
from supabase_client import supabase
from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_google_genai import (
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI
)

embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
llm = ChatGoogleGenerativeAI(model="gemini-pro")

def index_pdf(file):
    reader = PdfReader(file)
    text = "".join(p.extract_text() for p in reader.pages)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_text(text)

    for chunk in chunks:
        vector = embeddings.embed_query(chunk)
        supabase.table("pdf_docs").insert({
            "content": chunk,
            "embedding": vector
        }).execute()

def ask_pdf(question):
    query_vector = embeddings.embed_query(question)

    result = supabase.rpc(
        "match_pdf_docs",
        {"query_embedding": query_vector, "match_count": 3}
    ).execute()

    context = " ".join(r["content"] for r in result.data)

    prompt = f"""
Answer ONLY from the context below.
If not found, say "Not found in PDF".

Context:
{context}

Question:
{question}
"""
    return llm.invoke(prompt).content
