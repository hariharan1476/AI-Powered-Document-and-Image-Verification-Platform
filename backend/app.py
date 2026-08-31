from fastapi import FastAPI

from backend.database.db import Base, engine

from backend.routes.upload import router as upload_router
from backend.routes.verification import router as verification_router
from backend.routes.report import router as report_router


app = FastAPI(
    title="AI-Powered Document & Image Verification Platform",
    description="Backend API for document and image verification",
    version="1.0.0"
)


Base.metadata.create_all(
    bind=engine
)


app.include_router(upload_router)

app.include_router(verification_router)

app.include_router(report_router)


@app.get("/")
def root():

    return {
        "message": "AI Document Verification API",
        "status": "running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }