from datetime import datetime
import os
import hashlib
import re


# ---------------------------------------------------------
# FILE INTEGRITY
# ---------------------------------------------------------

def calculate_file_integrity(file_path: str):

    reasons = []

    if not os.path.exists(file_path):
        return {
            "score": 0,
            "reasons": ["File does not exist"]
        }

    score = 100

    file_size = os.path.getsize(file_path)

    if file_size == 0:
        return {
            "score": 0,
            "reasons": ["File is empty"]
        }

    reasons.append("File exists")
    reasons.append("File size is valid")

    return {
        "score": score,
        "reasons": reasons
    }


# ---------------------------------------------------------
# FILE FORMAT VALIDATION
# ---------------------------------------------------------

def validate_file_format(file_path: str, file_type: str):

    reasons = []

    extension = os.path.splitext(file_path)[1].lower()

    allowed_extensions = [
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    ]

    if extension not in allowed_extensions:

        return {
            "score": 0,
            "reasons": ["Unsupported file format"]
        }

    if extension != file_type.lower():

        return {
            "score": 50,
            "reasons": ["File type and extension do not match"]
        }

    reasons.append("File format is supported")

    return {
        "score": 100,
        "reasons": reasons
    }


# ---------------------------------------------------------
# COMPLETENESS
# ---------------------------------------------------------

def calculate_completeness(fields: dict):

    required_fields = [
        "name",
        "document_type",
        "certificate_id"
    ]

    optional_fields = [
        "organization",
        "course",
        "start_date",
        "end_date"
    ]

    score = 0
    reasons = []

    # Required fields
    for field in required_fields:

        value = fields.get(field)

        if value:
            score += 20
            reasons.append(f"{field} is present")
        else:
            reasons.append(f"{field} is missing")

    # Optional fields
    for field in optional_fields:

        value = fields.get(field)

        if value:
            score += 5
            reasons.append(f"{field} is present")
        else:
            reasons.append(f"{field} is missing")

    # Maximum possible = 80
    # Normalize to 100
    final_score = (score / 80) * 100

    return {
        "score": round(final_score, 2),
        "reasons": reasons
    }


# ---------------------------------------------------------
# CONSISTENCY
# ---------------------------------------------------------

def calculate_consistency(fields: dict, text: str):

    score = 100
    reasons = []

    name = fields.get("name")
    organization = fields.get("organization")
    start_date = fields.get("start_date")
    end_date = fields.get("end_date")
    certificate_id = fields.get("certificate_id")

    # Check name against extracted text
    if name:

        if name.lower() in text.lower():
            reasons.append("Name is consistent with document text")
        else:
            score -= 20
            reasons.append("Name does not match document text")

    # Check organization
    if organization:

        organization_words = organization.lower().split()

        matches = sum(
            word in text.lower()
            for word in organization_words
            if len(word) > 2
        )

        if matches >= max(1, len(organization_words) // 2):
            reasons.append(
                "Organization is consistent with document text"
            )
        else:
            score -= 20
            reasons.append(
                "Organization may not match document text"
            )

    # Check certificate ID
    if certificate_id:

        if certificate_id.lower() in text.lower():
            reasons.append(
                "Certificate ID is consistent with document text"
            )
        else:
            score -= 20
            reasons.append(
                "Certificate ID does not match document text"
            )

    # Check dates
    if start_date and end_date:

        try:

            start = datetime.strptime(
                start_date,
                "%d %b %Y"
            )

            end = datetime.strptime(
                end_date,
                "%d %b %Y"
            )

            if start <= end:
                reasons.append(
                    "Start date and end date are consistent"
                )
            else:
                score -= 30
                reasons.append(
                    "Start date is after end date"
                )

        except ValueError:

            score -= 10

            reasons.append(
                "Date format could not be validated"
            )

    return {
        "score": max(0, round(score, 2)),
        "reasons": reasons
    }


# ---------------------------------------------------------
# AUTHENTICITY INDICATORS
# ---------------------------------------------------------

def calculate_authenticity(
    file_path: str,
    file_type: str,
    fields: dict,
    text: str
):

    score = 0
    reasons = []

    # 1. File exists
    integrity = calculate_file_integrity(file_path)

    if integrity["score"] > 0:

        score += 25
        reasons.extend(integrity["reasons"])

    # 2. File format
    format_result = validate_file_format(
        file_path,
        file_type
    )

    if format_result["score"] == 100:

        score += 25
        reasons.extend(format_result["reasons"])

    # 3. Document contains meaningful text
    if text and len(text.strip()) >= 30:

        score += 25

        reasons.append(
            "Document contains meaningful extracted content"
        )

    else:

        reasons.append(
            "Document contains insufficient extracted content"
        )

    # 4. Identity/document information
    identity_fields = 0

    for field in [
        "name",
        "organization",
        "document_type",
        "certificate_id"
    ]:

        if fields.get(field):
            identity_fields += 1

    if identity_fields >= 2:

        score += 25

        reasons.append(
            "Document contains identifiable verification fields"
        )

    elif identity_fields == 1:

        score += 10

        reasons.append(
            "Document contains limited identifiable information"
        )

    else:

        reasons.append(
            "No identifiable verification fields found"
        )

    return {
        "score": min(100, round(score, 2)),
        "reasons": reasons
    }


# ---------------------------------------------------------
# OVERALL VERIFICATION
# ---------------------------------------------------------

def verify_document_data(
    file_path: str,
    file_type: str,
    fields: dict,
    text: str
):

    authenticity = calculate_authenticity(
        file_path,
        file_type,
        fields,
        text
    )

    completeness = calculate_completeness(
        fields
    )

    consistency = calculate_consistency(
        fields,
        text
    )

    # Weighted overall score
    overall_score = (
        authenticity["score"] * 0.40
        + completeness["score"] * 0.30
        + consistency["score"] * 0.30
    )

    overall_score = round(
        overall_score,
        2
    )

    # Result
    if overall_score >= 80:

        result = "Verified"

    elif overall_score >= 60:

        result = "Needs Review"

    else:

        result = "Rejected"

    all_reasons = (
        authenticity["reasons"]
        + completeness["reasons"]
        + consistency["reasons"]
    )

    return {

        "authenticity_score":
            authenticity["score"],

        "completeness_score":
            completeness["score"],

        "consistency_score":
            consistency["score"],

        "overall_score":
            overall_score,

        "result":
            result,

        "details":
            " | ".join(all_reasons)
    }


# ---------------------------------------------------------
# TEST
# ---------------------------------------------------------

if __name__ == "__main__":

    import sys

    from backend.ai.document_processor import process_document

    if len(sys.argv) < 2:

        print(
            "Usage: "
            "python -m backend.ai.verification_engine "
            "<file_path>"
        )

        exit()

    file_path = sys.argv[1]

    file_type = os.path.splitext(
        file_path
    )[1].lower()

    processed = process_document(
        file_path,
        file_type
    )

    result = verify_document_data(

        file_path=file_path,

        file_type=file_type,

        fields=processed["fields"],

        text=processed["text"]
    )

    print("\nVerification Result")
    print("-------------------")

    for key, value in result.items():

        print(f"{key}: {value}")