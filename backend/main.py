from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
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
async def upload_pdf(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    authorization: str = Header(None)
):
    from fastapi.responses import JSONResponse
    import traceback
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise ValueError("Missing or invalid Authorization header")
        token = authorization.split(" ", 1)[1]

        index_pdf(file.file, file.filename, project_id, token)
        return {"message": "PDF indexed successfully"}
    except Exception as e:
        print("--- ERROR IN /upload ---")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )


@app.post("/ask")
async def ask_question(
    payload: dict,
    authorization: str = Header(None)
):
    from fastapi.responses import JSONResponse
    import traceback
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise ValueError("Missing or invalid Authorization header")
        token = authorization.split(" ", 1)[1]

        project_id = payload.get("project_id")
        question = payload.get("question")

        if not project_id:
            raise ValueError("Missing project_id in payload")
        if not question:
            raise ValueError("Missing question in payload")

        answer = ask_pdf(question, project_id, token)
        return {"answer": answer}
    except Exception as e:
        print("--- ERROR IN /ask ---")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )
