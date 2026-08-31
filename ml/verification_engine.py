import os
import re
from typing import Dict, Any


# ============================================================
# CONFIGURATION
# ============================================================

SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

MIN_FILE_SIZE = 1_000
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# Expected fields for a certificate.
# Completeness is calculated from these fields.
CERTIFICATE_FIELDS = [
    "name",
    "organization",
    "course",
    "certificate_id",
    "start_date",
    "end_date",
]


# ============================================================
# TEXT EXTRACTION
# ============================================================

def extract_text(file_path: str) -> str:
    """
    Extract text from PDF or image.
    Uses the existing document_processor.py from this project.
    """

    import os
    from backend.ai.document_processor import process_document

    file_type = os.path.splitext(file_path)[1].lower()

    result = process_document(file_path, file_type)

    if not isinstance(result, dict):
        return ""

    text = result.get("text", "")

    if text is None:
        return ""

    return str(text)

# ============================================================
# FIELD EXTRACTION
# ============================================================

def extract_certificate_fields(text: str) -> Dict[str, Any]:
    """
    Extract certificate fields using the project's existing
    field extractor.
    """

    from backend.ai.field_extractor import extract_fields

    if not text or not text.strip():
        return {}

    fields = extract_fields(text)

    if not isinstance(fields, dict):
        return {}

    return fields


# ============================================================
# DOCUMENT CLASSIFICATION
# ============================================================

def classify_document(text: str):
    """
    Basic document classification.

    Returns:
        (document_type, confidence)
    """

    if not text or not text.strip():
        return "UNKNOWN", 0.0

    normalized = text.lower()

    certificate_keywords = [
        "certificate",
        "certificate of achievement",
        "certification",
        "certified",
        "certificate id",
        "certificate code",
        "credential",
    ]

    resume_keywords = [
        "resume",
        "curriculum vitae",
        "work experience",
        "professional experience",
        "education",
        "skills",
        "projects",
    ]

    certificate_matches = sum(
        1
        for keyword in certificate_keywords
        if keyword in normalized
    )

    resume_matches = sum(
        1
        for keyword in resume_keywords
        if keyword in normalized
    )

    if certificate_matches > resume_matches and certificate_matches > 0:
        confidence = min(
            100.0,
            70.0 + (certificate_matches * 5.0)
        )

        return "CERTIFICATE", confidence

    if resume_matches > certificate_matches and resume_matches > 0:
        confidence = min(
            100.0,
            70.0 + (resume_matches * 5.0)
        )

        return "RESUME", confidence

    return "UNKNOWN", 0.0


# ============================================================
# COMPLETENESS
# ============================================================

def calculate_completeness(
    fields: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculate completeness based on required certificate fields.

    Example:
        5 / 6 fields present = 83.33
    """

    if not isinstance(fields, dict):
        fields = {}

    present_fields = []
    missing_fields = []

    for field in CERTIFICATE_FIELDS:

        value = fields.get(field)

        if value is not None and str(value).strip():
            present_fields.append(field)
        else:
            missing_fields.append(field)

    total_fields = len(CERTIFICATE_FIELDS)

    if total_fields == 0:
        score = 0.0
    else:
        score = (
            len(present_fields) / total_fields
        ) * 100.0

    return {
        "score": round(score, 2),
        "total_fields": total_fields,
        "present_count": len(present_fields),
        "missing_count": len(missing_fields),
        "present_fields": present_fields,
        "missing_fields": missing_fields,
    }


# ============================================================
# CONSISTENCY
# ============================================================

def normalize_text(value: Any) -> str:
    """
    Normalize text before comparison.
    """

    if value is None:
        return ""

    value = str(value).lower()

    value = re.sub(
        r"[^a-z0-9]+",
        " ",
        value
    )

    return " ".join(value.split())


def field_is_consistent(
    field_value: Any,
    document_text: str
) -> bool:
    """
    Check whether an extracted field appears consistently
    inside the document text.
    """

    if field_value is None:
        return False

    field_value = str(field_value).strip()

    if not field_value:
        return False

    normalized_field = normalize_text(field_value)
    normalized_document = normalize_text(document_text)

    if not normalized_field:
        return False

    return normalized_field in normalized_document


def calculate_consistency(
    fields: Dict[str, Any],
    text: str
) -> Dict[str, Any]:
    """
    Calculate consistency using extracted fields and
    the original document text.

    Missing fields are not treated as inconsistent.
    """

    checks = []
    inconsistent_fields = []
    checked_fields = []

    for field in CERTIFICATE_FIELDS:

        value = fields.get(field)

        # Missing field belongs to completeness,
        # not consistency.
        if value is None or not str(value).strip():
            continue

        checked_fields.append(field)

        if field_is_consistent(value, text):

            checks.append(
                f"{field} is consistent with document text"
            )

        else:

            inconsistent_fields.append(field)

            checks.append(
                f"{field} is inconsistent with document text"
            )

    if not checked_fields:
        score = 0.0
    else:
        score = (
            (
                len(checked_fields)
                - len(inconsistent_fields)
            )
            / len(checked_fields)
        ) * 100.0

    return {
        "score": round(score, 2),
        "checked_fields": checked_fields,
        "inconsistent_fields": inconsistent_fields,
        "checks": checks,
    }


# ============================================================
# AUTHENTICITY
# ============================================================

def calculate_authenticity(
    file_path: str,
    text: str,
    fields: Dict[str, Any],
    classification_confidence: float,
) -> Dict[str, Any]:
    """
    Calculate an evidence-based authenticity score.

    IMPORTANT:
    This does NOT claim that a certificate is genuinely issued
    by an organization.

    It checks technical/document evidence available locally.
    """

    checks = []
    passed = 0
    total = 0

    # --------------------------------------------------------
    # File existence
    # --------------------------------------------------------

    total += 1

    if os.path.exists(file_path):
        passed += 1
        checks.append("File exists")
    else:
        checks.append("File does not exist")

    # --------------------------------------------------------
    # File format
    # --------------------------------------------------------

    total += 1

    extension = os.path.splitext(file_path)[1].lower()

    if extension in SUPPORTED_EXTENSIONS:
        passed += 1
        checks.append("File format is supported")
    else:
        checks.append("File format is not supported")

    # --------------------------------------------------------
    # File size
    # --------------------------------------------------------

    total += 1

    try:
        file_size = os.path.getsize(file_path)

        if MIN_FILE_SIZE <= file_size <= MAX_FILE_SIZE:
            passed += 1
            checks.append("File size is valid")
        else:
            checks.append("File size is outside the valid range")

    except OSError:
        checks.append("Could not determine file size")

    # --------------------------------------------------------
    # Meaningful content
    # --------------------------------------------------------

    total += 1

    if text and len(text.strip()) >= 20:
        passed += 1
        checks.append(
            "Document contains meaningful extracted content"
        )
    else:
        checks.append(
            "Document contains insufficient extracted content"
        )

    # --------------------------------------------------------
    # Verification fields
    # --------------------------------------------------------

    total += 1

    identifiable_fields = 0

    if isinstance(fields, dict):

        for field in [
            "name",
            "organization",
            "certificate_id",
        ]:

            value = fields.get(field)

            if value is not None and str(value).strip():
                identifiable_fields += 1

    if identifiable_fields >= 2:

        passed += 1

        checks.append(
            "Document contains identifiable verification fields"
        )

    else:

        checks.append(
            "Document contains insufficient verification fields"
        )

    # --------------------------------------------------------
    # Classification confidence
    # --------------------------------------------------------

    total += 1

    try:
        confidence = float(
            classification_confidence
        )
    except (TypeError, ValueError):
        confidence = 0.0

    if confidence >= 70:
        passed += 1
        checks.append(
            "Document classification confidence is acceptable"
        )
    else:
        checks.append(
            "Document classification confidence is low"
        )

    score = (
        passed / total
    ) * 100.0

    return {
        "score": round(score, 2),
        "checks": checks,
        "passed_checks": passed,
        "total_checks": total,
    }


# ============================================================
# TAMPER ANALYSIS
# ============================================================

def calculate_tamper_score(
    file_path: str,
    text: str,
    fields: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Basic structural tamper indicators.

    This is NOT forensic tamper detection.

    A score of 0 means no suspicious indicators were
    detected by these checks, NOT that tampering is impossible.
    """

    suspicious_indicators = []

    extension = os.path.splitext(
        file_path
    )[1].lower()

    # --------------------------------------------------------
    # Empty/very small document
    # --------------------------------------------------------

    try:
        file_size = os.path.getsize(file_path)

        if file_size < MIN_FILE_SIZE:
            suspicious_indicators.append(
                "File is unusually small"
            )

    except OSError:
        suspicious_indicators.append(
            "File size could not be checked"
        )

    # --------------------------------------------------------
    # Extracted content
    # --------------------------------------------------------

    if not text or len(text.strip()) < 20:

        suspicious_indicators.append(
            "Very little meaningful text was extracted"
        )

    # --------------------------------------------------------
    # Required certificate identification
    # --------------------------------------------------------

    certificate_id = None

    if isinstance(fields, dict):
        certificate_id = fields.get(
            "certificate_id"
        )

    if not certificate_id:

        suspicious_indicators.append(
            "Certificate identification field is missing"
        )

    # --------------------------------------------------------
    # Calculate score
    # --------------------------------------------------------

    # Each detected indicator adds 20 points.
    tamper_score = min(
        100.0,
        len(suspicious_indicators) * 20.0
    )

    if tamper_score == 0:
        status = "No basic tamper indicators detected"
    elif tamper_score < 50:
        status = "Low suspicious indicators"
    elif tamper_score < 80:
        status = "Moderate suspicious indicators"
    else:
        status = "High suspicious indicators"

    return {
        "score": round(tamper_score, 2),
        "status": status,
        "suspicious_indicators": suspicious_indicators,
    }


# ============================================================
# FINAL SCORE
# ============================================================

def calculate_overall_score(
    authenticity: float,
    completeness: float,
    consistency: float,
    tamper_score: float,
) -> float:
    """
    Weighted final score.

    Authenticity   = 35%
    Completeness   = 25%
    Consistency    = 25%
    Tamper safety  = 15%

    tamper_score represents suspicious evidence,
    therefore it is inverted for the final score.
    """

    tamper_safety = 100.0 - tamper_score

    overall = (
        (authenticity * 0.35)
        + (completeness * 0.25)
        + (consistency * 0.25)
        + (tamper_safety * 0.15)
    )

    return round(overall, 2)


# ============================================================
# FINAL DECISION
# ============================================================

def determine_status(
    overall_score: float,
    authenticity: float,
    completeness: float,
    consistency: float,
    tamper_score: float,
) -> str:
    """
    Determine final verification status.
    """

    # High suspicious evidence
    if tamper_score >= 60:
        return "REVIEW REQUIRED"

    # Very low authenticity evidence
    if authenticity < 50:
        return "REVIEW REQUIRED"

    # Major missing information
    if completeness < 60:
        return "REVIEW REQUIRED"

    # Major consistency problem
    if consistency < 60:
        return "REVIEW REQUIRED"

    # Overall decision
    if overall_score >= 85:
        return "VERIFIED"

    if overall_score >= 70:
        return "REVIEW REQUIRED"

    return "REJECTED"


# ============================================================
# CERTIFICATE VERIFICATION
# ============================================================

def verify_certificate(
    file_path: str,
    fields: Dict[str, Any],
    classification_confidence: float,
    text: str,
) -> Dict[str, Any]:
    """
    Complete certificate verification.
    """

    completeness_result = calculate_completeness(
        fields
    )

    consistency_result = calculate_consistency(
        fields,
        text
    )

    authenticity_result = calculate_authenticity(
        file_path,
        text,
        fields,
        classification_confidence
    )

    tamper_result = calculate_tamper_score(
        file_path,
        text,
        fields
    )

    authenticity = authenticity_result["score"]
    completeness = completeness_result["score"]
    consistency = consistency_result["score"]
    tamper_score = tamper_result["score"]

    overall_score = calculate_overall_score(
        authenticity,
        completeness,
        consistency,
        tamper_score
    )

    status = determine_status(
        overall_score,
        authenticity,
        completeness,
        consistency,
        tamper_score
    )

    # --------------------------------------------------------
    # Human-readable details
    # --------------------------------------------------------

    details = []

    details.extend(
        authenticity_result["checks"]
    )

    details.extend(
        completeness_result["checks"]
        if "checks" in completeness_result
        else []
    )

    details.extend(
        consistency_result["checks"]
    )

    if completeness_result["missing_fields"]:

        for field in completeness_result[
            "missing_fields"
        ]:

            details.append(
                f"{field} is missing"
            )

    details.extend(
        [
            f"Tamper analysis: {tamper_result['status']}"
        ]
    )

    for indicator in tamper_result[
        "suspicious_indicators"
    ]:

        details.append(
            f"Suspicious indicator: {indicator}"
        )

    return {
        "authenticity": authenticity,
        "completeness": completeness,
        "consistency": consistency,
        "tamper_score": tamper_score,
        "overall_score": overall_score,
        "status": status,

        "details": details,

        "authenticity_analysis":
            authenticity_result,

        "completeness_analysis":
            completeness_result,

        "consistency_analysis":
            consistency_result,

        "tamper_analysis":
            tamper_result,
    }


def verify_resume(text: str) -> Dict[str, Any]:
    """
    Resume verification.

    Uses the project's existing resume_extractor.py
    to extract structured resume fields and then
    calculates completeness based on the extracted data.
    """

    if not text or not text.strip():
        return {
            "fields": {},
            "sections_detected": {},
            "verification": {
                "completeness": 0.0,
                "consistency": 0.0,
                "authenticity": 0.0,
                "tamper_score": 0.0,
                "overall_score": 0.0,
                "status": "REVIEW REQUIRED",
                "details": [
                    "Could not extract meaningful resume text"
                ]
            }
        }

    # ---------------------------------------------------------
    # RESUME FIELD EXTRACTION
    # ---------------------------------------------------------

    try:
        from backend.ai.resume_extractor import extract_resume_fields

        fields = extract_resume_fields(text)

        if not isinstance(fields, dict):
            fields = {}

    except Exception as error:
        fields = {}

    # ---------------------------------------------------------
    # NORMALIZE EXPECTED FIELDS
    # ---------------------------------------------------------

    expected_fields = [
        "name",
        "email",
        "phone",
        "linkedin",
        "github",
        "professional_summary",
        "education",
        "work_experience",
        "projects",
        "skills",
        "certifications",
        "achievements"
    ]

    for field in expected_fields:
        if field not in fields:
            if field in [
                "education",
                "work_experience",
                "projects",
                "skills",
                "certifications",
                "achievements"
            ]:
                fields[field] = []
            else:
                fields[field] = None

    # ---------------------------------------------------------
    # SECTION DETECTION
    # ---------------------------------------------------------

    normalized = text.lower()

    resume_sections = {
        "contact": [
            "email",
            "phone",
            "mobile",
            "@"
        ],

        "education": [
            "education",
            "university",
            "college",
            "degree",
            "bachelor",
            "master"
        ],

        "experience": [
            "experience",
            "work experience",
            "employment",
            "internship",
            "intern"
        ],

        "skills": [
            "skills",
            "technical skills",
            "technologies",
            "programming"
        ],

        "projects": [
            "projects",
            "project"
        ],

        "certifications": [
            "certifications",
            "certification",
            "certificate"
        ],

        "achievements": [
            "achievements",
            "achievement",
            "awards",
            "secured",
            "won",
            "place"
        ]
    }

    detected_sections = {}

    for section, keywords in resume_sections.items():

        detected_sections[section] = any(
            keyword in normalized
            for keyword in keywords
        )

    # ---------------------------------------------------------
    # FIELD-BASED COMPLETENESS
    # ---------------------------------------------------------

    present_fields = []
    missing_fields = []

    for field in expected_fields:

        value = fields.get(field)

        if isinstance(value, list):

            if len(value) > 0:
                present_fields.append(field)
            else:
                missing_fields.append(field)

        elif value is not None and str(value).strip():

            present_fields.append(field)

        else:

            missing_fields.append(field)

    total_fields = len(expected_fields)

    if total_fields > 0:

        completeness = round(
            (
                len(present_fields)
                / total_fields
            ) * 100.0,
            2
        )

    else:

        completeness = 0.0

    # ---------------------------------------------------------
    # CONTACT CONSISTENCY
    # ---------------------------------------------------------

    consistency_checks = []
    inconsistent_fields = []
    checked_fields = []

    for field in [
        "name",
        "email",
        "phone",
        "linkedin",
        "github"
    ]:

        value = fields.get(field)

        if value is None or not str(value).strip():
            continue

        checked_fields.append(field)

        if field_is_consistent(
            value,
            text
        ):

            consistency_checks.append(
                f"{field} is consistent with document text"
            )

        else:

            inconsistent_fields.append(field)

            consistency_checks.append(
                f"{field} is inconsistent with document text"
            )

    if checked_fields:

        consistency = round(
            (
                (
                    len(checked_fields)
                    - len(inconsistent_fields)
                )
                / len(checked_fields)
            )
            * 100.0,
            2
        )

    else:

        consistency = 0.0

    # ---------------------------------------------------------
    # BASIC AUTHENTICITY / DOCUMENT EVIDENCE
    # ---------------------------------------------------------

    authenticity_checks = []
    authenticity_passed = 0
    authenticity_total = 0

    # Meaningful text
    authenticity_total += 1

    if len(text.strip()) >= 50:

        authenticity_passed += 1

        authenticity_checks.append(
            "Resume contains meaningful extracted content"
        )

    else:

        authenticity_checks.append(
            "Resume contains insufficient extracted content"
        )

    # Name
    authenticity_total += 1

    if fields.get("name"):

        authenticity_passed += 1

        authenticity_checks.append(
            "Resume contains a name"
        )

    else:

        authenticity_checks.append(
            "Resume name is missing"
        )

    # Email
    authenticity_total += 1

    if fields.get("email"):

        authenticity_passed += 1

        authenticity_checks.append(
            "Resume contains an email address"
        )

    else:

        authenticity_checks.append(
            "Resume email is missing"
        )

    # Phone
    authenticity_total += 1

    if fields.get("phone"):

        authenticity_passed += 1

        authenticity_checks.append(
            "Resume contains a phone number"
        )

    else:

        authenticity_checks.append(
            "Resume phone number is missing"
        )

    if authenticity_total > 0:

        authenticity = round(
            (
                authenticity_passed
                / authenticity_total
            ) * 100.0,
            2
        )

    else:

        authenticity = 0.0

    # ---------------------------------------------------------
    # RESUME TAMPER CHECK
    # ---------------------------------------------------------

    tamper_score = 0.0
    tamper_indicators = []

    if len(text.strip()) < 50:

        tamper_indicators.append(
            "Very little meaningful text was extracted"
        )

    if not fields.get("name"):

        tamper_indicators.append(
            "Resume name could not be identified"
        )

    if tamper_indicators:

        tamper_score = min(
            100.0,
            len(tamper_indicators) * 20.0
        )

    # ---------------------------------------------------------
    # OVERALL SCORE
    # ---------------------------------------------------------

    overall_score = calculate_overall_score(
        authenticity,
        completeness,
        consistency,
        tamper_score
    )

    # ---------------------------------------------------------
    # FINAL STATUS
    # ---------------------------------------------------------

    if tamper_score >= 60:

        status = "REVIEW REQUIRED"

    elif completeness < 60:

        status = "REVIEW REQUIRED"

    elif consistency < 60 and checked_fields:

        status = "REVIEW REQUIRED"

    elif overall_score >= 85:

        status = "VERIFIED"

    elif overall_score >= 70:

        status = "REVIEW REQUIRED"

    else:

        status = "REJECTED"

    # ---------------------------------------------------------
    # DETAILS
    # ---------------------------------------------------------

    details = []

    details.extend(
        authenticity_checks
    )

    for field in present_fields:

        details.append(
            f"{field} detected"
        )

    for field in missing_fields:

        details.append(
            f"{field} is missing"
        )

    details.extend(
        consistency_checks
    )

    if tamper_indicators:

        for indicator in tamper_indicators:

            details.append(
                f"Suspicious indicator: {indicator}"
            )

    else:

        details.append(
            "Tamper analysis: No basic tamper indicators detected"
        )

    # ---------------------------------------------------------
    # RETURN
    # ---------------------------------------------------------

    return {

        "fields": fields,

        "sections_detected":
            detected_sections,

        "verification": {

            "completeness":
                completeness,

            "consistency":
                consistency,

            "authenticity":
                authenticity,

            "tamper_score":
                tamper_score,

            "overall_score":
                overall_score,

            "status":
                status,

            "details":
                details,

            "completeness_analysis": {

                "score":
                    completeness,

                "total_fields":
                    total_fields,

                "present_count":
                    len(present_fields),

                "missing_count":
                    len(missing_fields),

                "present_fields":
                    present_fields,

                "missing_fields":
                    missing_fields
            },

            "consistency_analysis": {

                "score":
                    consistency,

                "checked_fields":
                    checked_fields,

                "inconsistent_fields":
                    inconsistent_fields,

                "checks":
                    consistency_checks
            },

            "authenticity_analysis": {

                "score":
                    authenticity,

                "checks":
                    authenticity_checks,

                "passed_checks":
                    authenticity_passed,

                "total_checks":
                    authenticity_total
            },

            "tamper_analysis": {

                "score":
                    tamper_score,

                "status":
                    (
                        "No basic tamper indicators detected"
                        if not tamper_indicators
                        else "Suspicious indicators detected"
                    ),

                "suspicious_indicators":
                    tamper_indicators
            }
        }
    }


# ============================================================
# MAIN VERIFICATION ENGINE
# ============================================================

def verify_document(file_path: str) -> Dict[str, Any]:
    """
    Main command-line verification function.

    Usage:

        python -m ml.verification_engine ml/test_images/1.pdf
    """

    if not file_path:
        raise ValueError(
            "File path is required"
        )

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"Document not found: {file_path}"
        )

    # --------------------------------------------------------
    # Extract text
    # --------------------------------------------------------

    text = extract_text(
        file_path
    )

    if not text or not text.strip():
        raise ValueError(
            "Could not extract meaningful text from document"
        )

    # --------------------------------------------------------
    # Classification
    # --------------------------------------------------------

    document_type, confidence = classify_document(
        text
    )

    # --------------------------------------------------------
    # Certificate
    # --------------------------------------------------------

    if document_type == "CERTIFICATE":

        fields = extract_certificate_fields(
            text
        )

        result = verify_certificate(
            file_path,
            fields,
            confidence,
            text
        )

        final_result = {
            "document_type": document_type,

            "classification_confidence":
                confidence,

            "fields": fields,

            "verification": result,
        }

    # --------------------------------------------------------
    # Resume
    # --------------------------------------------------------

    elif document_type == "RESUME":

        resume_result = verify_resume(
            text
        )

        final_result = {
            "document_type": document_type,

            "classification_confidence":
                confidence,

            **resume_result,
        }

    # --------------------------------------------------------
    # Unknown
    # --------------------------------------------------------

    else:

        final_result = {
            "document_type": "UNKNOWN",

            "classification_confidence":
                confidence,

            "fields": {},

            "verification": {
                "authenticity": 0.0,
                "completeness": 0.0,
                "consistency": 0.0,
                "tamper_score": 0.0,
                "overall_score": 0.0,
                "status": "REVIEW REQUIRED",
            },
        }

    return final_result


# ============================================================
# COMMAND LINE TEST
# ============================================================

if __name__ == "__main__":

    import sys
    import json

    if len(sys.argv) < 2:

        print(
            "Usage:"
        )

        print(
            "python -m ml.verification_engine <file_path>"
        )

        sys.exit(1)

    file_path = sys.argv[1]

    try:

        result = verify_document(
            file_path
        )

        print("\nVerification Result")
        print("-------------------")

        verification = result.get(
            "verification",
            {}
        )

        print(
            "authenticity_score:",
            verification.get(
                "authenticity",
                0
            )
        )

        print(
            "completeness_score:",
            verification.get(
                "completeness",
                0
            )
        )

        print(
            "consistency_score:",
            verification.get(
                "consistency",
                0
            )
        )

        print(
            "tamper_score:",
            verification.get(
                "tamper_score",
                0
            )
        )

        print(
            "overall_score:",
            verification.get(
                "overall_score",
                0
            )
        )

        print(
            "result:",
            verification.get(
                "status",
                "UNKNOWN"
            )
        )

        print(
            "details:"
        )

        details = verification.get(
            "details",
            []
        )

        for detail in details:
            print(
                f"- {detail}"
            )

        print("\nFull Result")
        print("-----------")

        print(
            json.dumps(
                result,
                indent=4,
                default=str
            )
        )

    except Exception as error:

        print(
            f"Verification failed: {error}"
        )

        sys.exit(1)