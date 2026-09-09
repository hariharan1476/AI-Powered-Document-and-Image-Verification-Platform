import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database.db import Base, engine
from backend.routes.upload import router as upload_router
from backend.routes.verification import router as verification_router
from backend.routes.report import router as report_router
from backend.routes.auth import router as auth_router
from backend.routes.admin import router as admin_router


app = FastAPI(
    title="AI-Powered Document & Image Verification Platform",
    description="Backend API for document and image verification",
    version="1.0.0"
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    err_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(f"[SERVER ERROR 500]: {err_str}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "traceback": err_str}
    )


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://ai-powered-document-and-image-verif.vercel.app,https://ai-powered-document-and-image-verification-platform.vercel.app"
)
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# DATABASE
# ---------------------------------------------------------

import backend.models  # Ensure all models are registered with Base metadata
Base.metadata.create_all(bind=engine)

# SEED ADMIN ON STARTUP
from backend.database.db import SessionLocal
from backend.models.user import User, AccountStatus
from backend.services.auth_service import hash_password
from datetime import datetime

db = SessionLocal()
try:
    admin_email = "hariharankrishnamoorthy1476@gmail.com"
    admin_pass = "Admin@2026!Hari"
    existing = db.query(User).filter(User.email == admin_email).first()
    if existing:
        existing.is_admin = True
        existing.hashed_password = hash_password(admin_pass)
        existing.status = AccountStatus.ACTIVE.value
        existing.is_email_verified = True
    else:
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
    db.commit()
except Exception as e:
    db.rollback()
    print(f"Error seeding admin: {e}")
finally:
    db.close()


# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(verification_router)
app.include_router(report_router)
app.include_router(admin_router)

# Serve uploaded files so admin can view PDFs directly
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "AI Document Verification API",
        "status": "running"
    }


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }