import os
from dotenv import load_dotenv
from pypdf import PdfReader
from supabase_client import supabase
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import (
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")


embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=GEMINI_API_KEY
)


llm = ChatGoogleGenerativeAI(
    model="models/gemini-2.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.2
)


def index_pdf(file):
    reader = PdfReader(file)
    text = ""

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text

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

def ask_pdf(question: str) -> str:
    query_vector = embeddings.embed_query(question)

    result = supabase.rpc(
        "match_pdf_docs",
        {
            "query_embedding": query_vector,
            "match_count": 3
        }
    ).execute()

    if not result.data:
        return "Not found in PDF"

    context = " ".join(row["content"] for row in result.data)

    prompt = f"""
Answer ONLY using the context below.
If the answer is not present, say: "Not found in PDF".

Context:
{context}

Question:
{question}
"""

    response = llm.invoke(prompt)
    return response.content
