# PDF Chat App

A full-stack AI-powered PDF chatbot built with:

**Next.js (Frontend)** + **Python FastAPI (Backend)** + **Firebase (Auth, Firestore, Storage)** + **LangChain + Gemini LLM**.

## Feature

- 🔐 Google Sign-in via Firebase Auth
- 📁 Project-based PDF management
- 📄 Upload PDFs and extract text automatically
- 🧠 Embed text chunks using Gemini Embeddings
- 🗄️ Store embeddings in Firestore
- 🔍 Cosine similarity search in Python
- 💬 Ask questions and get AI-powered answers from your PDFs

## How It Works

```
PDF → Text → Embeddings → Firestore
Question → Embedding → Cosine Similarity → Top Chunks → Gemini LLM → Answer
```

## Tech Stack

- Next.js 16 (App Router)
- FastAPI (Python)
- Firebase (Auth + Firestore + Storage)
- LangChain + Google Gemini
- Tailwind CSS + shadcn/ui

## Project Structure

```
pdfchat/
├── frontend/
│   ├── app/page.js              # Main UI (Firebase Auth, Firestore)
│   ├── components/
│   │   ├── ChatBox.jsx          # Question/answer UI
│   │   └── PdfUploader.jsx      # PDF upload UI
│   └── lib/
│       ├── firebase.js          # Firebase client setup
│       └── api.js               # Backend API calls
└── backend/
    ├── main.py                  # FastAPI routes
    ├── rag.py                   # RAG pipeline (index + ask)
    ├── firebase_client.py       # Firebase Admin SDK setup
    └── firebase-service-account.json  # ⚠️ NOT in git
```

## Setup

See the Firebase migration setup guide for full instructions.

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
