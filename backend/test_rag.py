from rag import ask_pdf
from supabase_client import supabase

if __name__ == "__main__":
    print("Testing Ask PDF...")
    try:
        # Check current data in supabase
        count = supabase.table("pdf_docs").select("*", count="exact", head=True).execute()
        print(f"Total documents in Supabase: {count.count}")

        # Try to query
        answer = ask_pdf("What is the main topic of the document?")
        print(f"Answer: {answer}")
    except Exception as e:
        print(f"Exception calling ask_pdf: {e}")
