import os
from dotenv import load_dotenv
from supabase import create_client

# 🔑 FORCE LOAD .env FROM CURRENT DIRECTORY
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(dotenv_path=ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ✅ DEBUG CHECK (TEMPORARY)
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase ENV variables not loaded")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
