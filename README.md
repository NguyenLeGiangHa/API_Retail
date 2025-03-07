# Retail Analytics Platform

A FastAPI-based platform that allows Data Engineers to execute SQL queries against a PostgreSQL database containing retail analytics data.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up your environment variables in `.env`:
```
DATABASE_URL=postgresql://postgres:12345@localhost:5432/retail_analytics
```

3. Create the database in PostgreSQL:
```sql
CREATE DATABASE retail_analytics;
```

4. Initialize the database tables:
```bash
python -m app.init_db
```

5. Start the API server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Usage

### Execute SQL Query

**Endpoint:** `POST /api/query`

**Request Body:**
```json
{
    "query": "SELECT * FROM customers LIMIT 5"
}
```

**Example Response:**
```json
{
    "success": true,
    "data": [
        {
            "customer_id": 1,
            "first_name": "John",
            "last_name": "Doe",
            ...
        },
        ...
    ],
    "row_count": 5,
    "columns": ["customer_id", "first_name", "last_name", ...]
}
```

## Database Schema

### Customers
- customer_id (PK)
- first_name
- last_name
- email
- phone
- gender
- birth_date
- registration_date
- address
- city

### Transactions
- transaction_id (PK)
- customer_id (FK)
- store_id (FK)
- transaction_date
- total_amount
- payment_method
- product_line_id (FK)
- quantity
- unit_price

### Stores
- store_id (PK)
- store_name
- address
- city
- store_type
- opening_date
- region

### Product_lines
- product_line_id (PK)
- name
- category
- subcategory
- brand
- unit_cost 