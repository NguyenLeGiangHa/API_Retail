from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import pandas as pd
import json
import io
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from urllib.parse import urlparse

from .database import get_db, engine, create_source_engine
from .models import Customer, Store, ProductLine, Transaction

app = FastAPI(title="Retail Analytics Platform")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DataSource(BaseModel):
    source_type: str  # "postgresql", "googlesheets", "file"
    connection_string: Optional[str] = None
    sheet_id: Optional[str] = None
    
class SQLQuery(BaseModel):
    query: str
    source_type: str
    connection_details: Optional[Dict[str, Any]] = None

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
    tables = {
        "Customer Profile": {
            "name": "customers",
            "fields": SCHEMA_MAPPINGS["customers"]["required_fields"],
            "description": "Customer demographic and contact information"
        },
        "Transactions": {
            "name": "transactions",
            "fields": SCHEMA_MAPPINGS["transactions"]["required_fields"],
            "description": "Sales transaction records"
        },
        "Stores": {
            "name": "stores",
            "fields": SCHEMA_MAPPINGS["stores"]["required_fields"],
            "description": "Store location and details"
        },
        "Product Line": {
            "name": "product_lines",
            "fields": SCHEMA_MAPPINGS["product_lines"]["required_fields"],
            "description": "Product catalog information"
        }
    }
    return tables

def validate_and_map_data(df: pd.DataFrame, table_name: str) -> pd.DataFrame:
    """Validate and map data to the standard schema"""
    required_fields = SCHEMA_MAPPINGS[table_name]["required_fields"]
    
    # Check for required fields
    missing_fields = [field for field in required_fields if field not in df.columns]
    if missing_fields:
        raise ValueError(f"Missing required fields: {missing_fields}")
    
    # Convert date columns
    date_columns = {
        "customers": ["birth_date", "registration_date"],
        "transactions": ["transaction_date"],
        "stores": ["opening_date"],
        "product_lines": []
    }
    
    for date_col in date_columns[table_name]:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col])
    
    # Select only the required columns in the correct order
    return df[required_fields]

@app.post("/api/query")
async def execute_query(sql_query: SQLQuery, db: Session = Depends(get_db)) -> Dict[str, Any]:
    try:
        # Create source database connection if needed
        source_db = None
        if sql_query.source_type == "postgresql":
            source_engine = create_source_engine(sql_query.connection_details["connection_string"])
            source_db = Session(bind=source_engine)
        
        # Execute the query on the source database
        result = (source_db or db).execute(text(sql_query.query))
        
        # Get column names and data
        columns = result.keys()
        rows = result.fetchall()
        
        # Convert to DataFrame for validation and mapping
        df = pd.DataFrame(rows, columns=columns)
        
        # Map data to standard schema
        table_name = None
        for table_info in SCHEMA_MAPPINGS.items():
            if all(field in df.columns for field in table_info[1]["required_fields"]):
                table_name = table_info[0]
                break
        
        if not table_name:
            raise ValueError("Query result doesn't match any standard schema")
            
        # Validate and map data
        mapped_df = validate_and_map_data(df, table_name)
        
        # Insert into data warehouse
        mapped_df.to_sql(
            table_name,
            engine,
            if_exists='append',
            index=False
        )
        
        # Return results
        return {
            "success": True,
            "data": mapped_df.to_dict('records'),
            "row_count": len(mapped_df),
            "columns": list(mapped_df.columns),
            "mapped_table": table_name
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing query: {str(e)}"
        )
    finally:
        if source_db:
            source_db.close()

@app.post("/api/upload/{table_name}")
async def upload_file(
    table_name: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        content = await file.read()
        
        # Read file into DataFrame
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload CSV or Excel files."
            )

        # Validate and map data
        mapped_df = validate_and_map_data(df, table_name)
        
        # Insert into data warehouse
        mapped_df.to_sql(
            table_name,
            engine,
            if_exists='append',
            index=False
        )

        return {
            "success": True,
            "message": f"Successfully uploaded and mapped data to {table_name}",
            "rows_inserted": len(mapped_df)
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing file: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 