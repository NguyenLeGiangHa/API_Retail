from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Supabase configuration (data warehouse)
supabase_url = os.getenv("SUPABASE_URL")
# Use service role key which bypasses RLS
supabase_key = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SUPABASE_KEY"))

def create_source_connection(host: str, port: str, database: str, username: str, password: str):
    """Create connection to source database using user-provided credentials"""
    try:
        connection_string = f"postgresql://{username}:{password}@{host}:{port}/{database}"
        logger.info(f"Connecting to source database at: {host}:{port}/{database}")
        
        engine = create_engine(connection_string)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Test the connection
        db.execute(text("SELECT 1"))
        logger.info("Source database connection successful")
        
        return db
    except Exception as e:
        logger.error(f"Error connecting to source database: {str(e)}")
        raise

def get_supabase():
    """Get connection to Supabase data warehouse with authentication"""
    try:
        logger.info(f"Connecting to Supabase at: {supabase_url}")
        client = create_client(supabase_url, supabase_key)
        
        # Sign in with a service account or use a JWT token
        # Option 1: Sign in with email/password
        # auth_response = client.auth.sign_in_with_password({
        #     "email": os.getenv("SUPABASE_USER_EMAIL"),
        #     "password": os.getenv("SUPABASE_USER_PASSWORD")
        # })
        
        # Option 2: Use service role key (preferred for backend services)
        # Make sure to set SUPABASE_SERVICE_KEY in your .env file
        
        return client
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {str(e)}")
        raise 