from backend.database.db import SessionLocal
from sqlalchemy import text

def make_admin():
    print("Connecting to database via SQLAlchemy...")
    db = SessionLocal()
    try:
        # Add is_admin column
        db.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;"))
        db.commit()
        print("Successfully added is_admin column.")
    except Exception as e:
        db.rollback()
        if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
            print("Column is_admin already exists.")
        else:
            print(f"Error adding column: {e}")

    try:
        # Make existing users admin
        db.execute(text("UPDATE users SET is_admin = TRUE;"))
        db.commit()
        print("Successfully promoted existing users to Admin.")
    except Exception as e:
        db.rollback()
        print(f"Error updating users: {e}")
        
    db.close()
    print("Done.")

if __name__ == "__main__":
    make_admin()
