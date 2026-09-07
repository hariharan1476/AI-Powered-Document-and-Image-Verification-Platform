from backend.database.db import Base, engine
from backend.models.user import User
from backend.models.document import Document
from backend.models.verification import Verification

def recreate():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Database recreated successfully.")

if __name__ == "__main__":
    recreate()
