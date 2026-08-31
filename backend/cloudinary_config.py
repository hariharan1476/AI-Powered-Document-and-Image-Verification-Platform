import os

import cloudinary
import cloudinary.uploader

from dotenv import load_dotenv


load_dotenv()


CLOUDINARY_CLOUD_NAME = os.getenv(
    "CLOUDINARY_CLOUD_NAME"
)

CLOUDINARY_API_KEY = os.getenv(
    "CLOUDINARY_API_KEY"
)

CLOUDINARY_API_SECRET = os.getenv(
    "CLOUDINARY_API_SECRET"
)


if not CLOUDINARY_CLOUD_NAME:
    raise RuntimeError(
        "CLOUDINARY_CLOUD_NAME is missing"
    )

if not CLOUDINARY_API_KEY:
    raise RuntimeError(
        "CLOUDINARY_API_KEY is missing"
    )

if not CLOUDINARY_API_SECRET:
    raise RuntimeError(
        "CLOUDINARY_API_SECRET is missing"
    )


cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True
)


def upload_document(file_path: str):

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    result = cloudinary.uploader.upload(
        file_path,
        resource_type="auto",
        folder="document-verification",
        use_filename=True,
        unique_filename=True,
        overwrite=False
    )

    return {
        "public_id": result.get("public_id"),
        "secure_url": result.get("secure_url"),
        "resource_type": result.get("resource_type"),
        "format": result.get("format"),
        "bytes": result.get("bytes"),
        "width": result.get("width"),
        "height": result.get("height"),
    }


def delete_document(
    public_id: str,
    resource_type: str = "image"
):

    if not public_id:
        return None

    return cloudinary.uploader.destroy(
        public_id,
        resource_type=resource_type
    )