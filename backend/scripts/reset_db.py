"""
Database Reset & Seeding Script
================================
Wipes all database tables (Verifications, Documents, Tokens, Sessions, OAuth, Users)
and seeds the primary Admin user (hariharankrishnamoorthy1476@gmail.com) and a Demo User.

Usage:
  python3 -m backend.scripts.reset_db
"""

import sys
import os
from datetime import datetime

# Ensure project root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database.db import engine, SessionLocal, Base
from backend.models.user import User, AccountStatus
from backend.models.session import Session
from backend.models.oauth_account import OAuthAccount
from backend.models.verification_token import VerificationToken
from backend.models.document import Document
from backend.models.verification import Verification
from backend.services.auth_service import hash_password


def reset_and_seed_database():
    print("================================================================")
    print("        RESETTING DATABASE & SEEDING ADMIN ACCOUNT              ")
    print("================================================================\n")
    
    db = SessionLocal()
    try:
        # 1. Clear existing data in reverse dependency order
        print("🚮 Clearing existing database tables...")
        db.query(Verification).delete()
        db.query(Document).delete()
        db.query(VerificationToken).delete()
        db.query(Session).delete()
        db.query(OAuthAccount).delete()
        db.query(User).delete()
        db.commit()
        print("  ✓ All existing data wiped clean.\n")

        # 2. Seed Primary Admin Account
        admin_email = "hariharankrishnamoorthy1476@gmail.com"
        admin_pass = "Admin@2026!Hari"
        
        print(f"👤 Creating Primary Admin Account: {admin_email}")
        admin_user = User(
            name="Hariharan Krishnamoorthy (Admin)",
            email=admin_email,
            hashed_password=hash_password(admin_pass),
            is_admin=True,
            is_email_verified=True,
            status=AccountStatus.ACTIVE.value,
            avatar_url="https://lh3.googleusercontent.com/a/default-user=s96-c",
            created_at=datetime.utcnow()
        )
        db.add(admin_user)
        
        # 3. Seed Standard Demo Account
        demo_email = "demo@example.com"
        demo_pass = "DemoUser@123"
        print(f"👤 Creating Demo User Account: {demo_email}")
        demo_user = User(
            name="Demo User",
            email=demo_email,
            hashed_password=hash_password(demo_pass),
            is_admin=False,
            is_email_verified=True,
            status=AccountStatus.ACTIVE.value,
            created_at=datetime.utcnow()
        )
        db.add(demo_user)
        
        db.commit()
        db.refresh(admin_user)
        db.refresh(demo_user)

        print("\n================================================================")
        print("    🎉 DATABASE RESET & SEEDING COMPLETED SUCCESSFULLY!        ")
        print("================================================================\n")
        print("🔑 INITIAL CREDENTIALS FOR YOUR APPLICATION:")
        print("----------------------------------------------------------------")
        print("👑 SUPER ADMIN USER:")
        print(f"   Email:    {admin_email}")
        print(f"   Password: {admin_pass}")
        print(f"   Role:     ADMIN (Full system access)")
        print("----------------------------------------------------------------")
        print("👤 DEMO USER:")
        print(f"   Email:    {demo_email}")
        print(f"   Password: {demo_pass}")
        print(f"   Role:     USER")
        print("================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"❌ Reset failed with error: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    reset_and_seed_database()
