from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from rag import index_pdf, ask_pdf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_pdf(file: UploadFile):
    index_pdf(file.file)
    return {"message": "PDF indexed successfully"}

@app.post("/ask")
async def ask_question(payload: dict):
    return {"answer": ask_pdf(payload["question"])}
