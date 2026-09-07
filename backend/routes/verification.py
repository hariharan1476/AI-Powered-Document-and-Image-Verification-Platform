import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models.document import Document
from backend.models.verification import Verification
from backend.services.verification_service import verify_uploaded_document
from backend.services.auth_service import get_current_user
from backend.models.user import User


router = APIRouter(
    prefix="/api/verification",
    tags=["Verification"]
)


@router.get("/history")
def get_user_verification_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all document verification history for the authenticated user.
    """
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )

    history = []
    for doc in documents:
        # Find latest verification for this document
        verification = (
            db.query(Verification)
            .filter(Verification.document_id == doc.id)
            .order_by(Verification.id.desc())
            .first()
        )

        res_dict = {}
        if verification and verification.result:
            if isinstance(verification.result, str):
                try:
                    res_dict = json.loads(verification.result)
                except json.JSONDecodeError:
                    res_dict = {"status": "completed"}
            elif isinstance(verification.result, dict):
                res_dict = verification.result

        history.append({
            "document_id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "cloudinary_url": doc.cloudinary_url,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "status": doc.status,
            "verification": {
                "id": verification.id if verification else None,
                "authenticity_score": verification.authenticity_score if verification else None,
                "completeness_score": verification.completeness_score if verification else None,
                "consistency_score": verification.consistency_score if verification else None,
                "overall_score": verification.overall_score if verification else None,
                "result": res_dict,
                "verified_at": verification.verified_at.isoformat() if verification and verification.verified_at else None
            } if verification else None
        })

    return {
        "count": len(history),
        "history": history
    }


@router.post("/{document_id}")
def verify_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Verify an uploaded document.
    """
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