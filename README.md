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
pdfchat/
│
├── backend/                         # 🧠 Python RAG Backend
│   │
│   ├── main.py                      # FastAPI entry point
│   ├── rag.py                       # RAG logic (LangChain + Gemini)
│   ├── supabase_client.py           # Supabase connection
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # 🔐 API keys (NOT committed)
│   ├── venv/                        # Python virtual environment
│   │
│   └── __pycache__/                 # Python cache (auto-generated)
│
├── frontend/                        # 🎨 Next.js Frontend
│   │
│   ├── app/
│   │   ├── page.jsx                 # Main UI page
│   │   ├── layout.jsx               # Root layout
│   │   └── globals.css              # Global styles
│   │
│   ├── components/
│   │   ├── PdfUploader.jsx          # PDF upload component
│   │   └── ChatBox.jsx              # Chat UI component
│   │
│   ├── lib/
│   │   └── api.js                   # Backend API calls
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   └── (static assets)
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── components.json              # shadcn/ui config
│   └── node_modules/
│
├── .gitignore                       # Ignore venv, node_modules, .env
├── README.md                        # Project documentation
└── sample.pdf                       # Test PDF (optional)

