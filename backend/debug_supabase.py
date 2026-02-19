import os
import socket
import sys
from urllib.parse import urlparse
from dotenv import load_dotenv
from supabase import create_client

# Force load .env
load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print(f"--- Supabase Debugger ---")
print(f"URL: {SUPABASE_URL}")
print(f"Key: {SUPABASE_KEY[:10]}..." if SUPABASE_KEY else "Key: NOT FOUND")

if not SUPABASE_URL:
    print("❌ Error: SUPABASE_URL is missing in .env")
    sys.exit(1)

try:
    parsed = urlparse(SUPABASE_URL)
    hostname = parsed.hostname
    print(f"\n1. Testing DNS resolution for {hostname}...")
    ip = socket.gethostbyname(hostname)
    print(f"✅ DNS Resolved: {hostname} -> {ip}")
except socket.gaierror as e:
    print(f"❌ DNS Error: Could not resolve {hostname}. {e}")
    print("   -> This means the URL is wrong or the project is deleted/paused.")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected Error: {e}")
    sys.exit(1)

print(f"\n2. Testing Supabase Client connection...")
try:
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    # Try a lightweight query - checking if we can even talk to the API
    # We query the 'pdf_docs' table, just 1 row, to see if it exists
    response = client.table("pdf_docs").select("count", count="exact", head=True).execute()
    print(f"✅ Connection Success! Table 'pdf_docs' found.")
except Exception as e:
    print(f"❌ Client Error: Failed to connect to Supabase.")
    print(f"   Reason: {e}")
