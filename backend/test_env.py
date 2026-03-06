import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

print("GEMINI_API_KEY:", os.getenv("GEMINI_API_KEY", "NOT FOUND")[:10] + "...")
print("FIREBASE_STORAGE_BUCKET:", os.getenv("FIREBASE_STORAGE_BUCKET", "NOT FOUND"))
