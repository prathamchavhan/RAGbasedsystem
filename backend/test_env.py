import os
from dotenv import load_dotenv

load_dotenv()

print(os.getenv("SUPABASE_URL"))
print(os.getenv("SUPABASE_KEY")[:10])
print(os.getenv("GEMINI_API_KEY")[:10])
