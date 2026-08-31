import os
import pymupdf
import pytesseract
from PIL import Image

from backend.ai.field_extractor import extract_fields


SUPPORTED_IMAGES = [".jpg", ".jpeg", ".png", ".webp"]


def process_document(file_path: str, file_type: str):

    extension = file_type.lower()

    if extension == ".pdf":
        return process_pdf(file_path)

    if extension in SUPPORTED_IMAGES:
        return process_image(file_path)

    raise ValueError("Unsupported file type")


def process_pdf(file_path: str):

    document = pymupdf.open(file_path)

    pages = []
    full_text = ""

    for page_number, page in enumerate(document):

        text = page.get_text()

        pages.append({
            "page_number": page_number + 1,
            "text": text
        })

        full_text += text + "\n"

    document.close()

    extracted_text = full_text.strip()

    fields = extract_fields(extracted_text)

    return {
        "file_type": "pdf",
        "page_count": len(pages),
        "text": extracted_text,
        "pages": pages,
        "fields": fields,
        "status": "processed"
    }


def process_image(file_path: str):

    image = Image.open(file_path)

    width, height = image.size

    # OCR
    extracted_text = pytesseract.image_to_string(image)

    extracted_text = extracted_text.strip()

    fields = extract_fields(extracted_text)

    return {
        "file_type": "image",
        "page_count": 1,
        "width": width,
        "height": height,
        "text": extracted_text,
        "pages": [
            {
                "page_number": 1,
                "text": extracted_text
            }
        ],
        "fields": fields,
        "status": "processed"
    }


if __name__ == "__main__":

    import sys
    import json

    if len(sys.argv) < 2:

        print(
            "Usage: "
            "python backend/ai/document_processor.py <file_path>"
        )

        exit()

    file_path = sys.argv[1]

    extension = os.path.splitext(file_path)[1].lower()

    result = process_document(
        file_path,
        extension
    )

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )