import os
import firebase_admin
from firebase_admin import credentials, db, auth
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

FIREBASE_SERVICE_ACCOUNT = os.path.join(BASE_DIR, "firebase-service-account.json")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL")

if not os.path.exists(FIREBASE_SERVICE_ACCOUNT):
    raise FileNotFoundError(
        "firebase-service-account.json not found in backend/. "
        "Download it from Firebase Console → Project Settings → Service Accounts."
    )

if not FIREBASE_DATABASE_URL:
    raise ValueError("FIREBASE_DATABASE_URL not set in backend/.env")

if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT)
    firebase_admin.initialize_app(cred, {
        "databaseURL": FIREBASE_DATABASE_URL,
    })



def get_db():
    """Return the root Realtime Database reference."""
    return db.reference("/")


def verify_token(id_token: str) -> str:
    """Verify Firebase ID token and return the uid."""
    decoded = auth.verify_id_token(id_token)
    return decoded["uid"]
