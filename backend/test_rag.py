import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from firebase_client import db

def test_firebase_connection():
    try:
        # Check pdf_docs collection count
        docs = db.collection("pdf_docs").limit(1).stream()
        count = sum(1 for _ in docs)
        print(f"✅ Firebase Firestore connected. pdf_docs collection accessible.")
    except Exception as e:
        print(f"❌ Firebase connection error: {e}")

if __name__ == "__main__":
    test_firebase_connection()
