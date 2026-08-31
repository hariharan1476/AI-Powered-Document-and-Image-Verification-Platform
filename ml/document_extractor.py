import sys
import fitz
import pytesseract
from PIL import Image

from verification import extract_fields
from verification import check_completeness
from verification import check_consistency


def extract_from_pdf(file_path):
    doc = fitz.open(file_path)
    text = ""

    for page in doc:
        text += page.get_text() + "\n"

    return text


def extract_from_image(file_path):
    image = Image.open(file_path)
    return pytesseract.image_to_string(image)


def extract_text(file_path):
    if file_path.lower().endswith(".pdf"):
        return extract_from_pdf(file_path)

    elif file_path.lower().endswith((".png", ".jpg", ".jpeg")):
        return extract_from_image(file_path)

    else:
        raise ValueError("Only PDF, PNG, JPG and JPEG files are supported.")


if __name__ == "__main__":

    if len(sys.argv) != 2:
        print("Usage:")
        print("python ml/document_extractor.py <file>")
        sys.exit(1)

    file_path = sys.argv[1]

    text = extract_text(file_path)

    print("\n========== OCR / PDF TEXT ==========")
    print(text)

    fields = extract_fields(text)

    completeness = check_completeness(fields)
    consistency = check_consistency(fields)

    print("\n========== EXTRACTED FIELDS ==========")

    for key, value in fields.items():
        print(f"{key}: {value}")

    print("\n========== VERIFICATION ==========")
    print(f"Completeness: {completeness}%")
    print(f"Consistency: {consistency['score']}%")
    print(f"Issues: {consistency['issues']}")