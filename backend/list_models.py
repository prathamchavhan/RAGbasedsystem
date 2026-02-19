import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

try:
    key = os.getenv("GEMINI_API_KEY")
    print(f"Using API Key: {key[:5]}...{key[-5:] if key and len(key)>10 else ''}")
    print("Listing all models...")
    for model in client.models.list(config={"query_base": True}):
        print(f"Model: {model.name}")
except Exception as e:
    print(f"Error: {e}")
