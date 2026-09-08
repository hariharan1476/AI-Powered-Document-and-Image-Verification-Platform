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


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# DATABASE
# ---------------------------------------------------------

import backend.models  # Ensure all models are registered with Base metadata
Base.metadata.create_all(bind=engine)


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