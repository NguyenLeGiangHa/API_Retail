from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Data warehouse connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:12345@localhost:5432/retail_analytics")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def create_source_engine(connection_string: str):
    """Create a new engine for source database connections"""
    return create_engine(connection_string)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 