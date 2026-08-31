import os
import sys
import fitz
from PIL import Image


SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".pdf"
}


def get_file_type(file_path):
    """
    Detect whether the uploaded document is an image or PDF.
    """

    extension = os.path.splitext(file_path)[1].lower()

    if extension == ".pdf":
        return "PDF"

    if extension in [".jpg", ".jpeg", ".png"]:
        return "IMAGE"

    return "UNKNOWN"


def validate_document(file_path):
    """
    Validate uploaded document.
    """

    if not os.path.exists(file_path):
        return False, "File does not exist"

    if not os.path.isfile(file_path):
        return False, "Path is not a file"

    extension = os.path.splitext(file_path)[1].lower()

    if extension not in SUPPORTED_EXTENSIONS:
        return False, f"Unsupported file type: {extension}"

    if os.path.getsize(file_path) == 0:
        return False, "File is empty"

    return True, "Valid document"


def inspect_image(file_path):
    """
    Basic image validation.
    """

    try:
        with Image.open(file_path) as image:

            return {
                "type": "IMAGE",
                "format": image.format,
                "width": image.width,
                "height": image.height,
                "mode": image.mode
            }

    except Exception as e:

        return {
            "type": "IMAGE",
            "error": str(e)
        }


def inspect_pdf(file_path):
    """
    Basic PDF inspection.
    """

    try:

        document = fitz.open(file_path)

        pages = len(document)

        total_text_length = 0

        for page in document:
            text = page.get_text()
            total_text_length += len(text.strip())

        metadata = document.metadata

        document.close()

        return {
            "type": "PDF",
            "pages": pages,
            "text_length": total_text_length,
            "metadata": metadata
        }

    except Exception as e:

        return {
            "type": "PDF",
            "error": str(e)
        }


def inspect_document(file_path):
    """
    Main document inspection function.
    """

    valid, message = validate_document(file_path)

    if not valid:

        return {
            "valid": False,
            "message": message
        }

    document_type = get_file_type(file_path)

    result = {
        "valid": True,
        "file": os.path.basename(file_path),
        "document_type": document_type,
        "size_bytes": os.path.getsize(file_path)
    }

    if document_type == "IMAGE":

        result["details"] = inspect_image(file_path)

    elif document_type == "PDF":

        result["details"] = inspect_pdf(file_path)

    return result


if __name__ == "__main__":

    if len(sys.argv) != 2:

        print(
            "Usage: python backend/document_loader.py <file>"
        )

        sys.exit(1)

    file_path = sys.argv[1]

    result = inspect_document(file_path)

    print("\n========== DOCUMENT INSPECTION ==========")

    for key, value in result.items():

        print(f"{key}: {value}")