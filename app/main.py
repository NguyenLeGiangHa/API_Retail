from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import pandas as pd
from oauth2client.service_account import ServiceAccountCredentials
from urllib.parse import urlparse
from sqlalchemy.exc import SQLAlchemyError
import logging
from datetime import datetime, date
import json
import numpy as np
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

from .database import get_supabase, create_source_connection
from .models import Customer, Store, ProductLine, Transaction

app = FastAPI(title="Retail Analytics Platform")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataSource(BaseModel):
    source_type: str  # "postgresql", "googlesheets", "file"
    connection_string: Optional[str] = None
    sheet_id: Optional[str] = None
    
class SQLQuery(BaseModel):
    query: str
    source_type: str
    connection_details: Optional[Dict[str, Any]] = None

class ConnectionDetails(BaseModel):
    host: str
    port: str
    database: str
    username: str
    password: str

# Schema mappings for each table
SCHEMA_MAPPINGS = {
    "customers": {
        "required_fields": [
            "customer_id", "first_name", "last_name", "email", 
            "phone", "gender", "birth_date", "registration_date", 
            "address", "city"
        ],
        "model": Customer
    },
    "transactions": {
        "required_fields": [
            "transaction_id", "customer_id", "store_id", 
            "transaction_date", "total_amount", "payment_method",
            "product_line_id", "quantity", "unit_price"
        ],
        "model": Transaction
    },
    "stores": {
        "required_fields": [
            "store_id", "store_name", "address", "city",
            "store_type", "opening_date", "region"
        ],
        "model": Store
    },
    "product_lines": {
        "required_fields": [
            "product_line_id", "name", "category", "subcategory",
            "brand", "unit_cost"
        ],
        "model": ProductLine
    }
}

@app.get("/api/tables")
async def get_tables():
    """Get available tables and their schemas"""
    try:
        supabase = get_supabase()
        
        # Get actual data from tables to show schema
        customers = supabase.table('customers').select("*").limit(1).execute()
        transactions = supabase.table('transactions').select("*").limit(1).execute()
        stores = supabase.table('stores').select("*").limit(1).execute()
        product_lines = supabase.table('product_lines').select("*").limit(1).execute()

        return {
            "Customer Profile": {
                "name": "customers",
                "fields": list(customers.data[0].keys()) if customers.data else [],
                "description": "Customer information"
            },
            "Transactions": {
                "name": "transactions",
                "fields": list(transactions.data[0].keys()) if transactions.data else [],
                "description": "Transaction records"
            },
            "Stores": {
                "name": "stores",
                "fields": list(stores.data[0].keys()) if stores.data else [],
                "description": "Store information"
            },
            "Product Line": {
                "name": "product_lines",
                "fields": list(product_lines.data[0].keys()) if product_lines.data else [],
                "description": "Product information"
            }
        }
    except Exception as e:
        logger.error(f"Error fetching tables: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Error fetching tables: {str(e)}"
        )

def validate_and_map_data(df: pd.DataFrame, table_name: str) -> pd.DataFrame:
    """Validate and map data to the standard schema"""
    try:
        required_fields = SCHEMA_MAPPINGS[table_name]["required_fields"]
        
        # Create a mapping of source columns to target columns
        column_mapping = {}
        for req_field in required_fields:
            # Try exact match first
            if req_field in df.columns:
                column_mapping[req_field] = req_field
                continue
                
            # Try case-insensitive match
            for col in df.columns:
                if col.lower() == req_field.lower():
                    column_mapping[col] = req_field
                    break
        
        # Check for missing required fields
        mapped_fields = set(column_mapping.values())
        missing_fields = set(required_fields) - mapped_fields
        if missing_fields:
            # For demo purposes, fill missing fields with default values
            logger.warning(f"Missing fields will be filled with defaults: {missing_fields}")
            for field in missing_fields:
                if "date" in field.lower():
                    df[field] = pd.Timestamp.now()
                elif "id" in field.lower():
                    df[field] = df.index + 1
                elif "amount" in field.lower() or "cost" in field.lower() or "price" in field.lower():
                    df[field] = 0.0
                elif "quantity" in field.lower():
                    df[field] = 1
                else:
                    df[field] = "Unknown"
        
        # Select required fields (now all should be present)
        result_df = pd.DataFrame()
        for field in required_fields:
            if field in df.columns:
                result_df[field] = df[field]
            else:
                # This should not happen due to the default values above
                result_df[field] = None
        
        # Convert date columns
        date_columns = {
            "customers": ["birth_date", "registration_date"],
            "transactions": ["transaction_date"],
            "stores": ["opening_date"],
            "product_lines": []
        }
        
        for date_col in date_columns.get(table_name, []):
            if date_col in result_df.columns:
                result_df[date_col] = pd.to_datetime(result_df[date_col])
        
        return result_df
        
    except Exception as e:
        logger.error(f"Error in data validation and mapping: {str(e)}")
        raise ValueError(f"Data validation failed: {str(e)}")

# Define request models
class QueryRequest(BaseModel):
    table: str
    query: str
    connection_details: ConnectionDetails

# Custom JSON encoder to handle timestamps and other non-serializable types
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if pd.isna(obj):
            return None
        return super().default(obj)

@app.post("/api/query")
async def execute_query(request: QueryRequest):
    logger.info(f"Executing query for table: {request.table}")
    source_db = None
    
    try:
        # Step 1: Create connection to source database
        source_db = create_source_connection(
            host=request.connection_details.host,
            port=request.connection_details.port,
            database=request.connection_details.database,
            username=request.connection_details.username,
            password=request.connection_details.password
        )
        
        # Step 2: Execute query on source database
        logger.info(f"Executing query on source database: {request.query}")
        result = source_db.execute(text(request.query))
        columns = result.keys()
        rows = result.fetchall()
        
        # Convert to DataFrame for processing
        df = pd.DataFrame(rows, columns=columns)
        logger.info(f"Query returned {len(df)} rows from source database")
        
        if df.empty:
            return {
                "success": True,
                "data": [],
                "row_count": 0,
                "columns": []
            }

        # Step 3: Map data to standard schema
        mapped_df = validate_and_map_data(df, request.table)
        logger.info("Data mapped to standard schema")

        # Step 4: Convert DataFrame to records with proper date handling
        # Convert timestamps to ISO format strings
        for col in mapped_df.select_dtypes(include=['datetime64']).columns:
            mapped_df[col] = mapped_df[col].dt.strftime('%Y-%m-%dT%H:%M:%S')
        
        records = mapped_df.to_dict('records')
        
        # Step 5: Insert into Supabase
        supabase = get_supabase()
        logger.info(f"Inserting {len(records)} records into Supabase")
        insert_response = supabase.table(request.table).insert(records).execute()
        
        # Step 6: Prepare response data
        # Also handle timestamps in the original data
        for col in df.select_dtypes(include=['datetime64']).columns:
            df[col] = df[col].dt.strftime('%Y-%m-%dT%H:%M:%S')
        
        result = {
            "success": True,
            "data": df.to_dict('records'),
            "row_count": len(df),
            "columns": list(df.columns),
            "inserted_count": len(insert_response.data) if insert_response.data else 0
        }
        
        logger.info(f"Successfully processed and inserted {result['inserted_count']} rows")
        return result

    except Exception as e:
        logger.error(f"Error in query execution: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Error executing query: {str(e)}"
        )
    finally:
        if source_db:
            source_db.close()

@app.post("/api/upload/{table_name}")
async def upload_file(
    table_name: str,
    file: UploadFile = File(...)
):
    logger.info(f"Received file upload request for table: {table_name}")
    logger.info(f"File name: {file.filename}")

    try:
        supabase = get_supabase()
        content = await file.read()
        
        # Read file into DataFrame
        logger.info("Reading file contents...")
        if file.filename.endswith('.csv'):
            df = pd.read_csv(content)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(content)
        else:
            logger.error(f"Unsupported file format: {file.filename}")
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload CSV or Excel files."
            )
        
        logger.info(f"File read successfully. Found {len(df)} rows")
        
        # Convert DataFrame to records
        records = df.to_dict('records')
        
        # Insert data using Supabase
        logger.info(f"Inserting {len(records)} records into {table_name}")
        response = supabase.table(table_name).insert(records).execute()
        
        logger.info("Data insertion complete")
        return {
            "success": True,
            "message": f"Successfully uploaded data to {table_name}",
            "rows_inserted": len(records),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail=f"Error processing file: {str(e)}"
        )

@app.post("/api/test-connection")
async def test_connection(request: ConnectionDetails):
    try:
        # Try to create a connection
        db = create_source_connection(
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password
        )
        
        # Test the connection with a simple query
        db.execute("SELECT 1")
        db.close()
        
        return {
            "success": True,
            "message": "Connection successful"
        }
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Connection failed: {str(e)}"
        )

# Configure custom JSON encoder for the app
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder({"detail": exc.detail}, encoder=CustomJSONEncoder),
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content=jsonable_encoder({"detail": str(exc)}, encoder=CustomJSONEncoder),
    )

def prepare_data_for_json(data):
    """Convert data to JSON-serializable format"""
    if isinstance(data, (datetime, date)):
        return data.isoformat()
    elif isinstance(data, (np.integer, np.int64)):
        return int(data)
    elif isinstance(data, (np.floating, np.float64)):
        return float(data)
    elif isinstance(data, np.ndarray):
        return data.tolist()
    elif isinstance(data, list):
        return [prepare_data_for_json(item) for item in data]
    elif isinstance(data, dict):
        return {key: prepare_data_for_json(value) for key, value in data.items()}
    elif pd.isna(data):
        return None
    else:
        return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 