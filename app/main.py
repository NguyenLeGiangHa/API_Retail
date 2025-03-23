from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import pandas as pd
import json
import logging
from datetime import datetime, date
import numpy as np
from sqlalchemy import text
import re
import hashlib

from .database import get_supabase, create_source_connection

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
)

# Add this class to filter sensitive information from logs
class SensitiveFilter(logging.Filter):
    def filter(self, record):
        if isinstance(record.msg, str):
            # Mask PostgreSQL connection URLs in logs
            record.msg = re.sub(
                r'postgresql:\/\/([^:]+):([^@]+)@', 
                r'postgresql://\1:********@', 
                record.msg
            )
            
            # Mask connection_url query parameters
            record.msg = re.sub(
                r'connection_url=postgresql:\/\/([^:]+):([^@]+)@', 
                r'connection_url=postgresql://\1:********@', 
                record.msg
            )
            
            # Mask password parameters
            record.msg = re.sub(r'password=([^&\s]+)', r'password=********', record.msg)
        return True

# Configure logging with the sensitive filter
logger = logging.getLogger(__name__)
logger.addFilter(SensitiveFilter())

# Schema mappings for each table
SCHEMA_MAPPINGS = {
    "customers": {
        "required_fields": [
            "customer_id", "first_name", "last_name", "email", 
            "phone", "gender", "birth_date", "registration_date", 
            "address", "city"
        ]
    },
    "transactions": {
        "required_fields": [
            "transaction_id", "customer_id", "store_id", 
            "transaction_date", "total_amount", "payment_method",
            "product_line_id", "quantity", "unit_price"
        ]
    },
    "stores": {
        "required_fields": [
            "store_id", "store_name", "address", "city",
            "store_type", "opening_date", "region"
        ]
    },
    "product_lines": {
        "required_fields": [
            "product_line_id", "name", "category", "subcategory",
            "brand", "unit_cost"
        ]
    }
}

class ConnectionDetails(BaseModel):
    host: str
    port: str
    database: str
    username: str
    password: str

class QueryRequest(BaseModel):
    table: str
    query: str
    connection_details: ConnectionDetails

# Helper function to convert data to JSON-serializable format
def convert_to_json_serializable(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, (np.integer, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_to_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_serializable(i) for i in obj]
    elif pd.isna(obj):
        return None
    return obj

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
        
        # Select required fields
        result_df = pd.DataFrame()
        for field in required_fields:
            if field in df.columns:
                result_df[field] = df[field]
            else:
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

@app.get("/api/tables")
async def get_tables():
    """Get available tables and their schemas"""
    return {
        "Customer Profile": {
            "name": "customers",
            "fields": SCHEMA_MAPPINGS["customers"]["required_fields"],
            "description": "Customer information"
        },
        "Transactions": {
            "name": "transactions",
            "fields": SCHEMA_MAPPINGS["transactions"]["required_fields"],
            "description": "Transaction records"
        },
        "Stores": {
            "name": "stores",
            "fields": SCHEMA_MAPPINGS["stores"]["required_fields"],
            "description": "Store information"
        },
        "Product Line": {
            "name": "product_lines",
            "fields": SCHEMA_MAPPINGS["product_lines"]["required_fields"],
            "description": "Product information"
        }
    }

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
        
        # Convert to JSON-serializable records
        records = convert_to_json_serializable(mapped_df.to_dict('records'))
        
        # Step 5: Insert into Supabase
        supabase = get_supabase()
        logger.info(f"Inserting {len(records)} records into Supabase")
        
        try:
            # Try to insert data
            insert_response = supabase.table(request.table).insert(records).execute()
            inserted_count = len(insert_response.data) if insert_response.data else 0
        except Exception as e:
            logger.warning(f"Insert failed: {str(e)}")
            inserted_count = 0
        
        # Step 6: Prepare response data
        # Also handle timestamps in the original data
        for col in df.select_dtypes(include=['datetime64']).columns:
            df[col] = df[col].dt.strftime('%Y-%m-%dT%H:%M:%S')
        
        # Convert to JSON-serializable format
        data = convert_to_json_serializable(df.to_dict('records'))
        
        result = {
            "success": True,
            "data": data,
            "row_count": len(df),
            "columns": list(df.columns),
            "inserted_count": inserted_count
        }
        
        logger.info(f"Successfully processed {result['row_count']} rows and inserted {inserted_count} rows")
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
    
    try:
        content = await file.read()
        
        # Read file into DataFrame
        if file.filename.endswith('.csv'):
            df = pd.read_csv(content)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(content)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload CSV or Excel files."
            )
        
        logger.info(f"File read successfully. Found {len(df)} rows")
        
        # Map data to standard schema
        mapped_df = validate_and_map_data(df, table_name)
        
        # Convert timestamps to ISO format strings
        for col in mapped_df.select_dtypes(include=['datetime64']).columns:
            mapped_df[col] = mapped_df[col].dt.strftime('%Y-%m-%dT%H:%M:%S')
        
        # Convert to JSON-serializable records
        records = convert_to_json_serializable(mapped_df.to_dict('records'))
        
        # Insert into Supabase
        supabase = get_supabase()
        logger.info(f"Inserting {len(records)} records into Supabase")
        
        try:
            # Try to insert data
            insert_response = supabase.table(table_name).insert(records).execute()
            inserted_count = len(insert_response.data) if insert_response.data else 0
        except Exception as e:
            logger.warning(f"Insert failed: {str(e)}")
            inserted_count = 0
        
        return {
            "success": True,
            "message": f"Successfully processed {len(records)} rows and inserted {inserted_count} rows",
            "rows_processed": len(records),
            "rows_inserted": inserted_count
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
        db.execute(text("SELECT 1"))
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

@app.get("/api/datasources/postgres/tables")
async def get_postgres_tables(
    connection_url: Optional[str] = None,
    host: Optional[str] = None,
    port: Optional[str] = None,
    database: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None
):
    """Get available tables from the connected Postgres data source"""
    source_db = None
    try:
        logger.info("Starting get_postgres_tables endpoint")
        
        # Determine connection method (URL or individual parameters)
        if host and port and database and username and password:
            # Using individual parameters
            connection_details = {
                "host": host,
                "port": port,
                "database": database,
                "username": username,
                # Create a hashed representation of password for logging
                "password_hash": hashlib.sha256(password.encode()).hexdigest()[:8] + "..."
            }
            logger.info(f"Using provided connection parameters for {username}@{host}:{port}/{database}")
            
            try:
                source_db = create_source_connection(
                    host=host,
                    port=port,
                    database=database,
                    username=username,
                    password=password
                )
                logger.info(f"Successfully connected to PostgreSQL at {host}:{port}/{database}")
            except Exception as e:
                sanitized_error = str(e).replace(password, "********") if password else str(e)
                logger.error(f"Error connecting to database: {sanitized_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to connect to database. Please verify your connection details."
                )
                
        elif connection_url:
            # Using connection URL - redact sensitive parts for logging
            masked_url = re.sub(
                r'postgresql:\/\/([^:]+):([^@]+)@', 
                r'postgresql://\1:********@', 
                connection_url
            )
            logger.info(f"Using connection URL: {masked_url}")
            
            # Parse the connection URL to extract connection details
            try:
                logger.info(f"Parsing connection URL (masked): postgresql://****:****@{masked_url.split('@')[1] if '@' in masked_url else 'invalid-url'}")
                
                # Handle both standard and pooler connection URLs
                url = masked_url.replace("postgresql://", "")
                
                # Split into credentials and host_info
                if "@" in url:
                    credentials, host_info = url.split("@", 1)
                else:
                    logger.error("Connection URL missing '@' separator")
                    raise ValueError("Connection URL missing '@' separator")
                    
                # Parse username and password
                if ":" in credentials:
                    username, password = credentials.split(":", 1)
                else:
                    username = credentials
                    password = ""
                    logger.warning("No password found in connection string")
                    
                # Parse host, port, and database
                if "/" in host_info:
                    host_port, database = host_info.split("/", 1)
                else:
                    host_port = host_info
                    database = "postgres"
                    logger.warning(f"No database specified in connection URL, using default: {database}")
                    
                # Parse host and port
                if ":" in host_port:
                    host, port = host_port.split(":", 1)
                else:
                    host = host_port
                    port = "5432"  # Default PostgreSQL port
                    logger.warning(f"No port specified in connection URL, using default: {port}")
                
            except Exception as e:
                logger.error(f"Error parsing connection URL: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid connection URL format. For pooler connections, use: postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:[port]/[database]. Error: {str(e)}"
                )
            
            logger.info(f"Attempting to connect to PostgreSQL at {host}:{port}/{database} with user {username}")
            
            # Create connection using parsed details
            try:
                source_db = create_source_connection(
                    host=host,
                    port=port,
                    database=database,
                    username=username,
                    password=password
                )
                logger.info("Successfully connected to PostgreSQL database")
            except Exception as e:
                logger.error(f"Error connecting to database: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to connect to database. Please verify your connection URL is correct. Error: {str(e)}"
                )
            
        else:
            logger.warning("No connection details provided")
            raise HTTPException(
                status_code=400, 
                detail="No connection details provided. Please provide either a PostgreSQL connection URL or individual connection parameters."
            )
        
        # Query to get all tables and columns
        try:
            logger.info("Executing query to fetch tables and columns")
            query = text("""
                SELECT 
                    t.table_schema as schema_name,
                    t.table_name,
                    c.column_name,
                    pg_catalog.obj_description(pgc.oid, 'pg_class') as description
                FROM 
                    information_schema.tables t
                JOIN 
                    information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
                JOIN 
                    pg_catalog.pg_class pgc ON pgc.relname = t.table_name
                WHERE 
                    t.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY 
                    t.table_schema, t.table_name, c.ordinal_position
            """)
            
            result = source_db.execute(query)
            columns = result.keys()
            rows = result.fetchall()
            logger.info(f"Query returned {len(rows)} rows")
            
            # Process results into a structured format
            tables = {}
            for row in rows:
                schema_name, table_name, column_name, description = row
                
                table_key = f"{schema_name}.{table_name}"
                
                if table_key not in tables:
                    tables[table_key] = {
                        "schema_name": schema_name,
                        "table_name": table_name,
                        "description": description or f"{table_name} table",
                        "columns": []
                    }
                
                tables[table_key]["columns"].append(column_name)
            
            logger.info(f"Successfully processed {len(tables)} tables")
            # Simply return the results - don't try to insert into Supabase
            return list(tables.values())
            
        except Exception as e:
            logger.error(f"Error executing table query: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error querying tables: {str(e)}"
            )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Unexpected error in get_postgres_tables: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    finally:
        if source_db:
            logger.info("Closing database connection")
            source_db.close() 