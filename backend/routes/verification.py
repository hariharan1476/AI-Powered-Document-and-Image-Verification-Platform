from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from backend.database.db import get_db
from backend.models.document import Document
from backend.services.verification_service import verify_uploaded_document


router = APIRouter(
    prefix="/api/verification",
    tags=["Verification"]
)


@router.post("/{document_id}")
def verify_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Verify an uploaded document.

    Pipeline:
        Document
            ↓
        Text / OCR extraction
            ↓
        Document classification
            ↓
        Field extraction
            ↓
        Completeness analysis
            ↓
        Consistency analysis
            ↓
        Authenticity analysis
            ↓
        LayoutLM analysis
            ↓
        Final verification result
            ↓
        PostgreSQL
    """

    # ---------------------------------------------------------
    # 1. FIND DOCUMENT
    # ---------------------------------------------------------

    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # ---------------------------------------------------------
    # 2. RUN VERIFICATION PIPELINE
    # ---------------------------------------------------------

    try:
        verification = verify_uploaded_document(
            db,
            document
        )

    except FileNotFoundError as error:
        db.rollback()

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Verification failed: {str(error)}"
        )

    # ---------------------------------------------------------
    # 3. CONVERT STORED RESULT TO JSON
    # ---------------------------------------------------------

    result = verification.result

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            result = {
                "status": "error",
                "message": result
            }

    if not isinstance(result, dict):
        result = {}

    # ---------------------------------------------------------
    # 4. RETURN API RESPONSE
    # ---------------------------------------------------------

    return {
        "message": "Document verification completed",

        "document": {
            "id": document.id,
            "filename": document.filename,
            "file_type": document.file_type,
            "file_size": document.file_size,
            "file_hash": document.file_hash,
            "status": document.status
        },

        "verification": {
            "authenticity_score": verification.authenticity_score,
            "completeness_score": verification.completeness_score,
            "consistency_score": verification.consistency_score,
            "overall_score": verification.overall_score
        },

        "result": result
    }