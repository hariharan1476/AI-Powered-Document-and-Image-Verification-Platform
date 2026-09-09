import json
import asyncio
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException,
    BackgroundTasks
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database.db import get_db, SessionLocal
from backend.models.document import Document
from backend.services.file_service import save_uploaded_file
from backend.services.job_manager import create_job, update_job, get_job, get_job_event, clear_job_event
from backend.services.verification_service import verify_uploaded_document
from backend.services.auth_service import get_current_user
from backend.models.user import User
from backend.cloudinary_config import upload_document as cloudinary_upload


router = APIRouter(
    prefix="/api/upload",
    tags=["Upload"]
)

def process_document_task(job_id: str, file_data: dict, user_id: int):
    db = SessionLocal()
    try:
        update_job(job_id, status="uploading_cloud", progress=10, log="Uploading document to Cloudinary")
        try:
            cloudinary_result = cloudinary_upload(file_data["file_path"])
        except Exception as error:
            print(f"Cloudinary upload warning: {error}. Falling back to local file path.")
            extension = file_data["file_type"]
            filename = file_data["filename"]
            cloudinary_result = {
                "public_id": f"local_{filename}",
                "secure_url": f"/uploads/{filename}",
                "resource_type": "raw" if extension == ".pdf" else "image",
            }
            
        file_data["cloudinary_public_id"] = cloudinary_result.get("public_id")
        file_data["cloudinary_url"] = cloudinary_result.get("secure_url")
        file_data["cloudinary_resource_type"] = cloudinary_result.get("resource_type")

        update_job(job_id, status="saving_database", progress=15, log="Creating database record")
        document = Document(
            filename=file_data["filename"],
            file_path=file_data["file_path"],
            file_type=file_data["file_type"],
            file_size=file_data["file_size"],
            file_hash=file_data["file_hash"],
            cloudinary_public_id=file_data["cloudinary_public_id"],
            cloudinary_url=file_data["cloudinary_url"],
            cloudinary_resource_type=file_data["cloudinary_resource_type"],
            status="uploaded",
            user_id=user_id
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        
        update_job(job_id, status="verifying", progress=20, log="Starting AI verification")
        
        # Verify uploaded document
        # We pass job_id so verify_uploaded_document can update progress
        verification = verify_uploaded_document(db, document, job_id=job_id)
        
        result = verification.result
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                result = {}
                
        final_response = {
            "message": "File uploaded and verification completed",
            "document": {
                "id": document.id,
                "filename": document.filename,
                "file_type": document.file_type,
                "file_size": document.file_size,
                "file_hash": document.file_hash,
                "status": document.status
            },
            "cloudinary": {
                "public_id": document.cloudinary_public_id,
                "url": document.cloudinary_url,
                "resource_type": document.cloudinary_resource_type
            },
            "verification": {
                "authenticity_score": verification.authenticity_score,
                "completeness_score": verification.completeness_score,
                "consistency_score": verification.consistency_score,
                "overall_score": verification.overall_score
            },
            "result": result
        }
        
        update_job(job_id, status="completed", progress=100, log="Verification complete", result=final_response)
        
    except Exception as e:
        db.rollback()
        update_job(job_id, status="failed", error=str(e), log=f"Error: {str(e)}")
    finally:
        db.close()


@router.post("/")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    try:
        job_id = create_job()
        update_job(job_id, status="uploading_local", progress=5, log="Saving file to local disk")
        
        file_data = save_uploaded_file(file)
        
        background_tasks.add_task(process_document_task, job_id, file_data, current_user.id)
        
        return {
            "message": "Verification started",
            "job_id": job_id
        }
        
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))
    except Exception as error:
        raise HTTPException(status_code=500, detail="File upload failed: " + str(error))


async def event_generator(job_id: str):
    import time
    last_idx = 0
    while True:
        job = get_job(job_id)
        if not job:
            yield f"data: {json.dumps({'error': 'Job not found'})}\n\n"
            break
            
        # Yield any new logs
        current_logs = job["logs"]
        if len(current_logs) > last_idx:
            for log in current_logs[last_idx:]:
                yield f"data: {json.dumps({'status': job['status'], 'progress': job['progress'], 'log': log})}\n\n"
            last_idx = len(current_logs)
            
        if job["status"] == "completed":
            yield f"data: {json.dumps({'status': 'completed', 'progress': 100, 'result': job['result']})}\n\n"
            break
        elif job["status"] == "failed":
            yield f"data: {json.dumps({'status': 'failed', 'error': job['error']})}\n\n"
            break
            
        # Wait for next event
        event = get_job_event(job_id)
        if event:
            try:
                await asyncio.wait_for(event.wait(), timeout=1.0)
                clear_job_event(job_id)
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                yield ": ping\n\n"
        else:
            await asyncio.sleep(1)

@router.get("/job/{job_id}")
def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/stream/{job_id}")
async def stream_job(job_id: str):
    return StreamingResponse(
        event_generator(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )