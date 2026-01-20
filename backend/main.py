from fastapi import FastAPI, UploadFile
from rag import index_pdf, ask_pdf

app = FastAPI()

@app.post("/upload")
async def upload_pdf(file: UploadFile):
    index_pdf(file.file)
    return {"message": "PDF indexed"}

@app.post("/ask")
async def ask_question(data: dict):
    return {"answer": ask_pdf(data["question"])}
