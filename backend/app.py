from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.db import Base, engine
from backend.routes.upload import router as upload_router
from backend.routes.verification import router as verification_router
from backend.routes.report import router as report_router


app = FastAPI(
    title="AI-Powered Document & Image Verification Platform",
    description="Backend API for document and image verification",
    version="1.0.0"
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# DATABASE
# ---------------------------------------------------------

Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

app.include_router(upload_router)
app.include_router(verification_router)
app.include_router(report_router)


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