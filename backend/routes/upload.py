from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from backend.database.db import get_db

from backend.models.document import Document

from backend.services.file_service import (
    save_uploaded_file
)

from backend.services.verification_service import (
    verify_uploaded_document
)


router = APIRouter(
    prefix="/api/upload",
    tags=["Upload"]
)


@router.post("/")
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    try:

        # -----------------------------------------
        # 1. Save + Cloudinary upload
        # -----------------------------------------

        file_data = save_uploaded_file(file)


        # -----------------------------------------
        # 2. Create database record
        # -----------------------------------------

        document = Document(
            filename=file_data["filename"],
            file_path=file_data["file_path"],
            file_type=file_data["file_type"],
            file_size=file_data["file_size"],
            file_hash=file_data["file_hash"],

            cloudinary_public_id=file_data[
                "cloudinary_public_id"
            ],

            cloudinary_url=file_data[
                "cloudinary_url"
            ],

            cloudinary_resource_type=file_data[
                "cloudinary_resource_type"
            ],

            status="uploaded"
        )

        db.add(document)
        db.commit()
        db.refresh(document)


        # -----------------------------------------
        # 3. AI DOCUMENT VERIFICATION
        # -----------------------------------------

        verification = verify_uploaded_document(
            db,
            document
        )


        # -----------------------------------------
        # 4. Read verification result
        # -----------------------------------------

        import json

        result = verification.result

        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                result = {}


        # -----------------------------------------
        # 5. API RESPONSE
        # -----------------------------------------

        return {

            "message":
                "File uploaded and verification completed",

            "document": {

                "id":
                    document.id,

                "filename":
                    document.filename,

                "file_type":
                    document.file_type,

                "file_size":
                    document.file_size,

                "file_hash":
                    document.file_hash,

                "status":
                    document.status
            },

            "cloudinary": {

                "public_id":
                    document.cloudinary_public_id,

                "url":
                    document.cloudinary_url,

                "resource_type":
                    document.cloudinary_resource_type
            },

            "verification": {

                "authenticity_score":
                    verification.authenticity_score,

                "completeness_score":
                    verification.completeness_score,

                "consistency_score":
                    verification.consistency_score,

                "overall_score":
                    verification.overall_score
            },

            "result":
                result
        }


    except ValueError as error:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


    except FileNotFoundError as error:

        db.rollback()

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "File upload and verification failed: "
                + str(error)
            )
        )