from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True)
    phone = Column(String)
    gender = Column(String)
    birth_date = Column(Date)
    registration_date = Column(Date)
    address = Column(String)
    city = Column(String)

    transactions = relationship("Transaction", back_populates="customer")

class Store(Base):
    __tablename__ = "stores"

    store_id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String)
    address = Column(String)
    city = Column(String)
    store_type = Column(String)
    opening_date = Column(Date)
    region = Column(String)

    transactions = relationship("Transaction", back_populates="store")

class ProductLine(Base):
    __tablename__ = "product_lines"

    product_line_id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String)
    subcategory = Column(String)
    brand = Column(String)
    unit_cost = Column(Float)

    transactions = relationship("Transaction", back_populates="product_line")

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"))
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    product_line_id = Column(Integer, ForeignKey("product_lines.product_line_id"))
    transaction_date = Column(Date)
    total_amount = Column(Float)
    payment_method = Column(String)
    quantity = Column(Integer)
    unit_price = Column(Float)

    customer = relationship("Customer", back_populates="transactions")
    store = relationship("Store", back_populates="transactions")
    product_line = relationship("ProductLine", back_populates="transactions") 