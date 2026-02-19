import os
from dotenv import load_dotenv
from pypdf import PdfReader
from supabase_client import get_auth_client
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
    model="models/gemini-2.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.2
)


def index_pdf(file, filename: str, project_id: str, auth_token: str):
    file_bytes = file.read()
    file.seek(0)
    
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

    client = get_auth_client(auth_token)
    user_resp = client.auth.get_user(auth_token)
    user_id = user_resp.user.id
    
    # Upload to Supabase Storage for later download
    try:
        storage_path = f"{user_id}/{project_id}/{filename}"
        client.storage.from_("pdfs").upload(
            file=file_bytes,
            path=storage_path,
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
    except Exception as e:
        print(f"Warning: Failed to upload to Supabase Storage: {e}")

    for chunk in chunks:
        vector = embeddings.embed_query(chunk)

        client.table("pdf_docs").insert({
            "content": chunk,
            "embedding": vector,
            "filename": filename,
            "project_id": project_id,
            "user_id": user_id
        }).execute()

def ask_pdf(question: str, project_id: str, auth_token: str) -> str:
    query_vector = embeddings.embed_query(question)

    client = get_auth_client(auth_token)
    result = client.rpc(
        "match_pdf_docs",
        {
            "query_embedding": query_vector,
            "target_project_id": project_id,
            "match_count": 10
        }
    ).execute()

    if not result.data:
        return "No information found in the project's PDFs."

    context = "\n\n".join([f"Document excerpt:\n{row['content']}" for row in result.data])

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
