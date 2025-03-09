import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def test_supabase_connection():
    try:
        # Initialize Supabase client
        supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )
        
        # Test query
        response = supabase.table('customers').select("*").limit(1).execute()
        
        print("Connection successful!")
        print(f"Data retrieved: {response.data}")
        
    except Exception as e:
        print("Connection failed!")
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_supabase_connection() 