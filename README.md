# 📄 PDF Chat Application using RAG

A full-stack **PDF Question Answering system** built using  
**Next.js (Frontend)** + **Python FastAPI (Backend)** + **Supabase (Vector DB)** + **LangChain + Gemini LLM**.

Users can upload a PDF and ask questions.  
Answers are generated **only from the uploaded PDF** using **Retrieval-Augmented Generation (RAG)**.

---

## 🚀 Features

- 📤 Upload PDF files
- 🔍 Convert PDF text into vector embeddings
- 🗄️ Store embeddings in Supabase (pgvector)
- 🤖 Ask questions using Gemini LLM
- ✅ Answers come strictly from PDF content (no hallucination)
- 🔐 API keys stored securely using `.env`

---

## 🧠 How RAG Works (Simple Explanation)

PDF → Text → Embeddings → Supabase
Question → Similarity Search → Gemini → Answer


---

## 🛠 Tech Stack

### Frontend
- Next.js (JSX)
- Tailwind CSS
- shadcn/ui

### Backend
- Python 3
- FastAPI
- LangChain
- Gemini LLM
- Supabase (Vector Database)

---

## 📁 Project Structure
<pre> pdfchat/ ├── backend/ │ ├── main.py │ ├── rag.py │ ├── supabase_client.py │ ├── requirements.txt │ ├── .env │ ├── venv/ │ └── __pycache__/ │ ├── frontend/ │ ├── app/ │ │ ├── page.jsx │ │ ├── layout.jsx │ │ └── globals.css │ │ │ ├── components/ │ │ ├── PdfUploader.jsx │ │ └── ChatBox.jsx │ │ │ ├── lib/ │ │ └── api.js │ │ │ ├── public/ │ │ └── favicon.ico │ │ │ ├── package.json │ ├── package-lock.json │ ├── tailwind.config.js │ ├── postcss.config.js │ ├── components.json │ └── node_modules/ │ ├── .gitignore ├── README.md └── sample.pdf </pre>
