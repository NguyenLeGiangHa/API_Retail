from .models import Base
from .database import engine

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Inserting database tables...")
    init_db()
    print("Database tables inserted successfully!") 