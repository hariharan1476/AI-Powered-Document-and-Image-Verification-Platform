import os
import sys
import fitz
import pytesseract

from PIL import Image


def ocr_image(image):
    """
    Extract text from an image using Tesseract OCR.
    """

    try:
        text = pytesseract.image_to_string(image)

        return text.strip()

    except Exception as e:

        print(f"OCR error: {e}")

        return ""


def extract_from_image(file_path):
    """
    Extract text from JPG / JPEG / PNG.
    """

    try:

        image = Image.open(file_path)

        text = ocr_image(image)

        return {
            "source_type": "IMAGE",
            "pages": 1,
            "text": text
        }

    except Exception as e:

        return {
            "source_type": "IMAGE",
            "pages": 1,
            "text": "",
            "error": str(e)
        }


def extract_pdf_text(file_path):
    """
    Extract selectable text from a PDF.
    """

    document = fitz.open(file_path)

    pages_text = []

    for page_number, page in enumerate(document):

        text = page.get_text()

        pages_text.append(
            f"--- PAGE {page_number + 1} ---\n{text.strip()}"
        )

    document.close()

    return "\n\n".join(pages_text).strip()


def extract_scanned_pdf(file_path):
    """
    Render PDF pages as images and run OCR.
    """

    document = fitz.open(file_path)

    pages_text = []

    for page_number, page in enumerate(document):

        pixmap = page.get_pixmap(
            matrix=fitz.Matrix(2, 2),
            alpha=False
        )

        image = Image.frombytes(
            "RGB",
            [pixmap.width, pixmap.height],
            pixmap.samples
        )

        text = ocr_image(image)

        pages_text.append(
            f"--- PAGE {page_number + 1} ---\n{text}"
        )

    document.close()

    return "\n\n".join(pages_text).strip()


def extract_from_pdf(file_path):
    """
    Extract text from both normal and scanned PDFs.
    """

    try:

        document = fitz.open(file_path)

        page_count = len(document)

        text = extract_pdf_text(file_path)

        document.close()

        # If PDF already contains enough text,
        # use the native PDF text.
        if len(text.strip()) >= 50:

            return {
                "source_type": "PDF_TEXT",
                "pages": page_count,
                "text": text
            }

        # Otherwise treat it as a scanned PDF.
        print(
            "Little/no selectable PDF text detected."
        )

        print(
            "Running OCR on PDF pages..."
        )

        ocr_text = extract_scanned_pdf(
            file_path
        )

        return {
            "source_type": "PDF_OCR",
            "pages": page_count,
            "text": ocr_text
        }

    except Exception as e:

        return {
            "source_type": "PDF",
            "pages": 0,
            "text": "",
            "error": str(e)
        }


def extract_document(file_path):
    """
    Generic document text extraction.
    """

    extension = os.path.splitext(
        file_path
    )[1].lower()

    if extension in [
        ".jpg",
        ".jpeg",
        ".png"
    ]:

        return extract_from_image(
            file_path
        )

    if extension == ".pdf":

        return extract_from_pdf(
            file_path
        )

    return {
        "source_type": "UNKNOWN",
        "pages": 0,
        "text": "",
        "error": "Unsupported file type"
    }


if __name__ == "__main__":

    if len(sys.argv) != 2:

        print(
            "Usage: python ml/generic_extractor.py <file>"
        )

        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):

        print(
            f"File not found: {file_path}"
        )

        sys.exit(1)

    result = extract_document(
        file_path
    )

    print(
        "\n========== GENERIC DOCUMENT EXTRACTION =========="
    )

    print(
        f"Source Type : {result['source_type']}"
    )

    print(
        f"Pages       : {result['pages']}"
    )

    print(
        f"Text Length : {len(result['text'])}"
    )

    if result.get("error"):

        print(
            f"Error       : {result['error']}"
        )

    print(
        "\n========== EXTRACTED TEXT =========="
    )

    print(result["text"])