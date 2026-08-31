import os
import shutil

from fastapi import UploadFile

from backend.utils.file_validator import validate_file
from backend.utils.helpers import calculate_file_hash
from backend.cloudinary_config import upload_document


UPLOAD_FOLDER = "uploads"


def save_uploaded_file(file: UploadFile):

    os.makedirs(
        UPLOAD_FOLDER,
        exist_ok=True
    )

    # -----------------------------------------
    # 1. Validate file
    # -----------------------------------------

    valid, message = validate_file(
        file.filename
    )

    if not valid:
        raise ValueError(message)

    # -----------------------------------------
    # 2. Create safe local path
    # -----------------------------------------

    filename = os.path.basename(
        file.filename
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    # -----------------------------------------
    # 3. Save local file
    # -----------------------------------------

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    # -----------------------------------------
    # 4. File information
    # -----------------------------------------

    file_size = os.path.getsize(
        file_path
    )

    file_hash = calculate_file_hash(
        file_path
    )

    extension = os.path.splitext(
        filename
    )[1].lower()

    # -----------------------------------------
    # 5. Upload to Cloudinary
    # -----------------------------------------

    try:

        cloudinary_result = upload_document(
            file_path
        )

    except Exception as error:

        # Remove local file if Cloudinary fails
        if os.path.exists(file_path):
            os.remove(file_path)

        raise ValueError(
            f"Cloudinary upload failed: {str(error)}"
        )

    # -----------------------------------------
    # 6. Return everything
    # -----------------------------------------

    return {

        "filename": filename,

        "file_path": file_path,

        "file_type": extension,

        "file_size": file_size,

        "file_hash": file_hash,

        "cloudinary_public_id":
            cloudinary_result.get(
                "public_id"
            ),

        "cloudinary_url":
            cloudinary_result.get(
                "secure_url"
            ),

        "cloudinary_resource_type":
            cloudinary_result.get(
                "resource_type"
            )
    }