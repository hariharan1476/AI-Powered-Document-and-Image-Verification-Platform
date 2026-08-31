from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models.verification import Verification


router = APIRouter(
    prefix="/api/report",
    tags=["Report"]
)


@router.get("/{document_id}")
def get_report(
    document_id: int,
    db: Session = Depends(get_db)
):

    verification = db.query(
        Verification
    ).filter(
        Verification.document_id == document_id
    ).order_by(
        Verification.id.desc()
    ).first()

    if not verification:

        raise HTTPException(
            status_code=404,
            detail="Verification report not found"
        )

    return {
        "document_id":
            verification.document_id,

        "result":
            verification.result,

        "authenticity_score":
            verification.authenticity_score,

        "completeness_score":
            verification.completeness_score,

        "consistency_score":
            verification.consistency_score,

        "overall_score":
            verification.overall_score,

        "details":
            verification.details,

        "verified_at":
            verification.verified_at
    }