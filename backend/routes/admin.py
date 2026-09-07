import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.models.user import User
from backend.models.document import Document
from backend.services.auth_service import get_current_admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    users = db.query(User).all()
    # Mask password
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_admin": u.is_admin,
            "created_at": u.created_at
        } for u in users
    ]

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    # Documents have a foreign key to user_id. We manually delete them here just in case cascading isn't set up.
    db.query(Document).filter(Document.user_id == user_id).delete()
    
    db.delete(user)
    db.commit()
    return None

@router.get("/documents")
def get_all_documents(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    docs = db.query(Document).all()
    result = []
    for doc in docs:
        user = db.query(User).filter(User.id == doc.user_id).first()

        # Serve PDF via API endpoint (works on localhost now, real URL when deployed)
        file_url = f"/api/admin/documents/{doc.id}/view" if doc.file_path else None

        result.append({
            "id": doc.id,
            "filename": doc.filename,
            "status": doc.status,
            "score": None,
            "feedback": None,
            "created_at": doc.uploaded_at,
            "user_email": user.email if user else "Unknown",
            "file_url": file_url,
            "download_url": doc.cloudinary_url or file_url,
        })
    return result

@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    db.delete(doc)
    db.commit()
    return None


@router.get("/documents/{doc_id}/view")
def view_document(
    doc_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Stream a document file directly to the browser for inline viewing."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = doc.filename
    media_type = "application/pdf" if filename.lower().endswith(".pdf") else "application/octet-stream"

    # If file exists on local disk, serve it directly
    if doc.file_path and os.path.exists(doc.file_path):
        return FileResponse(
            path=doc.file_path,
            media_type=media_type,
            filename=filename,
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )

    # If file is not on disk (e.g. in production), proxy it from Cloudinary
    if doc.cloudinary_url:
        import requests
        from fastapi.responses import StreamingResponse
        try:
            response = requests.get(doc.cloudinary_url, stream=True)
            response.raise_for_status()
            return StreamingResponse(
                response.iter_content(chunk_size=8192),
                media_type=media_type,
                headers={"Content-Disposition": f"inline; filename={filename}"}
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch from Cloudinary: {str(e)}")

    raise HTTPException(status_code=404, detail="File not found anywhere")
