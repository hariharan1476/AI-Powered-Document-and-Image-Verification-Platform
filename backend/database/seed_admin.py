import asyncio
from backend.database.db import SessionLocal
from backend.models.user import User
from backend.services.auth_service import get_password_hash

def seed_admin():
    db = SessionLocal()
    existing_user = db.query(User).filter(User.email == "test2@test.com").first()
    if not existing_user:
        hashed = get_password_hash("password123")
        admin = User(name="test2", email="test2@test.com", hashed_password=hashed, is_admin=True)
        db.add(admin)
        db.commit()
        print("Admin user test2@test.com created successfully.")
    else:
        print("User already exists.")
    db.close()

if __name__ == "__main__":
    seed_admin()
