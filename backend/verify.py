import os
import sys
import json
import re
import subprocess
import tempfile
from backend.ai.resume_extractor import extract_resume_fields
# ============================================================
# LAYOUTLMV3 DOCUMENT AI
# ============================================================

try:
    from ml.layoutlm_analyzer import analyze_document

    LAYOUTLM_AVAILABLE = True

except Exception as error:

    analyze_document = None

    LAYOUTLM_AVAILABLE = False

    print(
        f"LayoutLMv3 unavailable: {error}"
    )
# ============================================================
# PROJECT CONFIGURATION
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

ML_DIR = os.path.join(
    PROJECT_ROOT,
    "ml"
)

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tiff",
    ".pdf"
}


# ============================================================
# COMMAND RUNNER
# ============================================================

def run_command(command):
    """
    Run a project command and return stdout.
    """

    result = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:

        error_message = (
            result.stderr.strip()
            or result.stdout.strip()
            or f"Command failed: {' '.join(command)}"
        )

        raise RuntimeError(error_message)

    return result.stdout


# ============================================================
# FILE VALIDATION
# ============================================================

def validate_file(file_path):
    """
    Validate uploaded document/image.
    """

    if not file_path:
        raise ValueError(
            "File path is empty"
        )

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    if not os.path.isfile(file_path):
        raise ValueError(
            f"Not a file: {file_path}"
        )

    extension = os.path.splitext(
        file_path
    )[1].lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension}"
        )

    return True


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_spaces(value):
    """
    Normalize repeated spaces.
    """

    if value is None:
        return None

    value = re.sub(
        r"[ \t]+",
        " ",
        str(value)
    )

    return value.strip()


def clean_extracted_text(text):
    """
    Remove OCR/extractor metadata.
    """

    if not text:
        return ""

    cleaned_lines = []

    for line in text.splitlines():

        stripped = line.strip()

        if not stripped:
            continue

        if stripped.startswith(
            "warning:"
        ):
            continue

        if stripped.startswith(
            "=========="
        ):
            continue

        if stripped.startswith(
            "(venv)"
        ):
            continue

        cleaned_lines.append(
            stripped
        )

    return "\n".join(
        cleaned_lines
    ).strip()


# ============================================================
# TEMPORARY TEXT FILE
# ============================================================

def create_temp_text(text):
    """
    Create temporary text file for ML classifiers.
    """

    temp_file = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        suffix=".txt",
        delete=False
    )

    temp_file.write(
        text
    )

    temp_file.close()

    return temp_file.name


# ============================================================
# OCR / DOCUMENT EXTRACTION
# ============================================================

def extract_ocr_text(extractor_output):
    """
    Extract actual document text from generic_extractor.py.
    """

    if not extractor_output:
        return ""

    marker = (
        "========== EXTRACTED TEXT =========="
    )

    if marker in extractor_output:

        text = extractor_output.split(
            marker,
            1
        )[1]

        return clean_extracted_text(
            text
        )

    # Fallback:
    # If extractor doesn't print the marker,
    # use the output itself.
    return clean_extracted_text(
        extractor_output
    )


def extract_text(file_path):
    """
    Main OCR/text extraction function.

    This function is imported by:
        backend.services.verification_service
    """

    validate_file(
        file_path
    )

    extractor_script = os.path.join(
        ML_DIR,
        "generic_extractor.py"
    )

    if not os.path.exists(
        extractor_script
    ):
        raise FileNotFoundError(
            "ml/generic_extractor.py not found"
        )

    output = run_command([
        sys.executable,
        extractor_script,
        file_path
    ])

    text = extract_ocr_text(
        output
    )

    if not text:
        raise RuntimeError(
            "No text could be extracted from the document."
        )

    return text


# ============================================================
# DOCUMENT CLASSIFICATION
# ============================================================

def classify_document(text):
    """
    Classify document as:
        CERTIFICATE
        RESUME
        OTHER

    Returns:
        (document_type, confidence)

    This tuple is compatible with the current
    verification_service.py.
    """

    if not text:
        return (
            "OTHER",
            0.0
        )

    temp_file = create_temp_text(
        text
    )

    try:

        classifier_script = os.path.join(
            ML_DIR,
            "document_classifier.py"
        )

        output = run_command([
            sys.executable,
            classifier_script,
            temp_file
        ])

    finally:

        if os.path.exists(
            temp_file
        ):
            os.remove(
                temp_file
            )

    document_type = "OTHER"
    confidence = 0.0

    # --------------------------------------------------------
    # Document type
    # --------------------------------------------------------

    match = re.search(
        r"Document Type\s*:\s*([A-Z_]+)",
        output,
        flags=re.IGNORECASE
    )

    if match:

        document_type = (
            match.group(1)
            .strip()
            .upper()
        )

    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    match = re.search(
        r"Confidence\s*:\s*"
        r"([0-9]+(?:\.[0-9]+)?)%",
        output,
        flags=re.IGNORECASE
    )

    if match:

        confidence = float(
            match.group(1)
        )

    return (
        document_type,
        confidence
    )


# ============================================================
# GENERAL CLEANING
# ============================================================

def normalize_identifier(value):
    """
    Remove OCR spaces from identifiers.
    """

    if not value:
        return None

    value = str(value)

    value = re.sub(
        r"\s+",
        "",
        value
    )

    value = re.sub(
        r"[^A-Za-z0-9\-]",
        "",
        value
    )

    return value or None


def clean_name(value):
    """
    Clean extracted person name.
    """

    if not value:
        return None

    value = value.replace(
        "\n",
        " "
    )

    value = normalize_spaces(
        value
    )

    # Remove student/college ID
    value = re.sub(
        r"\b[A-Z]{2,6}\d{4,20}\b",
        "",
        value,
        flags=re.IGNORECASE
    )

    value = normalize_spaces(
        value
    )

    if not value:
        return None

    if len(value) > 80:
        return None

    bad_values = {
        "mongo",
        "mongodb",
        "certificate",
        "certificate of achievement",
        "certificate of completion",
        "skills",
        "course",
        "program",
        "training"
    }

    if value.lower() in bad_values:
        return None

    return value


def clean_course(value):
    """
    Clean course/title.
    """

    if not value:
        return None

    value = value.replace(
        "\n",
        " "
    )

    value = normalize_spaces(
        value
    )

    if not value:
        return None

    if len(value) > 200:
        return None

    return value


def clean_organization(value):
    """
    Clean organization name.
    """

    if not value:
        return None

    value = value.replace(
        "\n",
        " "
    )

    value = normalize_spaces(
        value
    )

    if not value:
        return None

    lower = value.lower()

    known = {
        "tata consultancy services":
            "Tata Consultancy Services",

        "tcs ion":
            "TCS iON",

        "mongodb":
            "MongoDB",

        "ibm":
            "IBM",

        "microsoft":
            "Microsoft",

        "google":
            "Google",

        "amazon web services":
            "Amazon Web Services",

        "aws":
            "AWS",

        "oracle":
            "Oracle",

        "infosys":
            "Infosys",

        "cisco":
            "Cisco",

        "coursera":
            "Coursera",

        "udemy":
            "Udemy",

        "nptel":
            "NPTEL",

        "simplilearn":
            "Simplilearn",

        "great learning":
            "Great Learning",

        "linkedin":
            "LinkedIn",

        "edx":
            "edX"
    }

    for key, normalized in known.items():

        if key in lower:
            return normalized

    return value


# ============================================================
# DATE EXTRACTION
# ============================================================

def extract_dates(text):
    """
    Extract common certificate date formats.

    Supports:

        03 Feb 2024
        03rd Feb 2024
        01st Feb 2023
        04-11-2024
        04/11/2024
        04.11.2024
    """

    patterns = [

        # 01st Feb 2023
        r"\b"
        r"\d{1,2}"
        r"(?:st|nd|rd|th)?"
        r"\s+"
        r"[A-Za-z]{3,12}"
        r"\s+"
        r"\d{4}"
        r"\b",

        # 04-11-2024
        r"\b"
        r"\d{1,2}"
        r"[-/\.]"
        r"\d{1,2}"
        r"[-/\.]"
        r"\d{4}"
        r"\b"
    ]

    dates = []

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        for item in matches:

            item = normalize_spaces(
                item
            )

            if item not in dates:
                dates.append(
                    item
                )

    return dates


def extract_start_end_dates(text):
    """
    Extract start/end dates.

    If only one date exists,
    use it for both.
    """

    start_date = None
    end_date = None

    date_pattern = (
        r"("
        r"\d{1,2}"
        r"(?:st|nd|rd|th)?"
        r"\s+"
        r"[A-Za-z]{3,12}"
        r"\s+"
        r"\d{4}"
        r"|"
        r"\d{1,2}"
        r"[-/\.]"
        r"\d{1,2}"
        r"[-/\.]"
        r"\d{4}"
        r")"
    )

    # Start date
    match = re.search(
        r"start\s*date\s*[:\-]?\s*"
        + date_pattern,
        text,
        flags=re.IGNORECASE
    )

    if match:
        start_date = match.group(1)

    # End date
    match = re.search(
        r"end\s*date\s*[:\-]?\s*"
        + date_pattern,
        text,
        flags=re.IGNORECASE
    )

    if match:
        end_date = match.group(1)

    # Date / issued date
    if not start_date:

        match = re.search(
            r"(?:date|issued\s+on|issue\s+date|"
            r"completion\s+date)"
            r"\s*[:\-]?\s*"
            + date_pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:
            start_date = match.group(1)

    # Generic fallback
    dates = extract_dates(
        text
    )

    if not start_date and dates:
        start_date = dates[0]

    if not end_date and len(dates) >= 2:
        end_date = dates[1]

    # Single-date certificate
    if start_date and not end_date:
        end_date = start_date

    return (
        start_date,
        end_date
    )


# ============================================================
# CERTIFICATE NAME EXTRACTION
# ============================================================

def extract_name_from_text(text):
    """
    Extract certificate holder name.

    Supports:

        HARIHARAN K

        HARIHARAN K URK22AI1048
        MongoDB Node.js Developer Path

        Congratulations!
        HARIHARAN K
    """

    # --------------------------------------------------------
    # Pattern 1
    # Name before:
    # for successfully completing
    # --------------------------------------------------------

    match = re.search(
        r"([A-Za-z][A-Za-z .'-]{1,80})"
        r"\s+for\s+successfully\s+completing",
        text,
        flags=re.IGNORECASE
    )

    if match:

        name = clean_name(
            match.group(1)
        )

        if name:
            return name

    # --------------------------------------------------------
    # Pattern 2
    # Name after Congratulations
    # --------------------------------------------------------

    match = re.search(
        r"congratulations"
        r"\s*[!\.:]?"
        r"\s*\n+"
        r"\s*"
        r"([A-Za-z][A-Za-z .'-]{1,80})"
        r"(?:\n|$)",
        text,
        flags=re.IGNORECASE
    )

    if match:

        name = clean_name(
            match.group(1)
        )

        if name:
            return name

    # --------------------------------------------------------
    # Prepare lines
    # --------------------------------------------------------

    lines = [
        normalize_spaces(line)
        for line in text.splitlines()
        if normalize_spaces(line)
    ]

    # --------------------------------------------------------
    # Pattern 3
    #
    # HARIHARAN K URK22AI1048
    #
    # Take text before student ID.
    # --------------------------------------------------------

    for line in lines:

        id_match = re.search(
            r"\b[A-Z]{2,6}\d{4,20}\b",
            line,
            flags=re.IGNORECASE
        )

        if id_match:

            before_id = (
                line[:id_match.start()]
                .strip()
            )

            name = clean_name(
                before_id
            )

            if name:
                return name

    # --------------------------------------------------------
    # Pattern 4
    # Explicit name labels
    # --------------------------------------------------------

    patterns = [
        r"(?:name|candidate|recipient|"
        r"student\s*name|certificate\s+holder)"
        r"\s*[:\-]\s*"
        r"([A-Za-z][A-Za-z .'-]{1,80})"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:

            name = clean_name(
                match.group(1)
            )

            if name:
                return name

    # --------------------------------------------------------
    # Pattern 5
    # First suitable uppercase line
    # --------------------------------------------------------

    for line in lines:

        candidate = clean_name(
            line
        )

        if not candidate:
            continue

        lower = candidate.lower()

        if any(
            word in lower
            for word in [
                "certificate",
                "mongodb",
                "developer",
                "consultancy",
                "services",
                "programming",
                "python",
                "course",
                "training",
                "congratulations",
                "date",
                "issued",
                "code"
            ]
        ):
            continue

        if re.search(
            r"\d",
            candidate
        ):
            continue

        if re.fullmatch(
            r"[A-Z][A-Z .'-]{1,60}",
            candidate
        ):
            return candidate

    return None


# ============================================================
# CERTIFICATE COURSE EXTRACTION
# ============================================================

def extract_course_from_text(text):
    """
    Extract course/title from different certificate layouts.
    """

    lines = [
        normalize_spaces(line)
        for line in text.splitlines()
        if normalize_spaces(line)
    ]

    # --------------------------------------------------------
    # Pattern 1
    #
    # successfully completing
    # Introduction to Python
    # a course that covers
    # --------------------------------------------------------

    match = re.search(
        r"successfully\s+completing\s+"
        r"(.+?)"
        r"\s+"
        r"(?:a\s+course\s+that\s+covers|"
        r"course\s+that\s+covers)",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    if match:

        course = clean_course(
            match.group(1)
        )

        if course:
            return course

    # --------------------------------------------------------
    # Pattern 2
    #
    # completed Python course
    # --------------------------------------------------------

    match = re.search(
        r"(?:successfully\s+)?completed\s+"
        r"(.+?)(?:\n|$)",
        text,
        flags=re.IGNORECASE
    )

    if match:

        course = clean_course(
            match.group(1)
        )

        if course:
            return course

    # --------------------------------------------------------
    # Pattern 3
    # Explicit labels
    # --------------------------------------------------------

    label_patterns = [
        r"(?:course|course\s+title)"
        r"\s*[:\-]\s*(.+)",

        r"(?:program|program\s+title)"
        r"\s*[:\-]\s*(.+)",

        r"(?:training|training\s+title)"
        r"\s*[:\-]\s*(.+)",

        r"(?:subject|title)"
        r"\s*[:\-]\s*(.+)"
    ]

    for pattern in label_patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:

            course = clean_course(
                match.group(1)
            )

            if course:
                return course

    # --------------------------------------------------------
    # Pattern 4
    #
    # HARIHARAN K URK22AI1048
    # MongoDB Node.js Developer Path
    #
    # Course is immediately after student ID.
    # --------------------------------------------------------

    for i, line in enumerate(lines):

        if re.search(
            r"\b[A-Z]{2,6}\d{4,20}\b",
            line,
            flags=re.IGNORECASE
        ):

            if i + 1 < len(lines):

                candidate = clean_course(
                    lines[i + 1]
                )

                if candidate:

                    lower = candidate.lower()

                    if not any(
                        word in lower
                        for word in [
                            "certificate",
                            "congratulations",
                            "date",
                            "issued",
                            "code"
                        ]
                    ):

                        return candidate

    # --------------------------------------------------------
    # Pattern 5
    #
    # Generic certificate layout:
    #
    # HARIHARAN K
    # Programming with Python 3.X
    # 01st Feb 2023
    # Certificate code : 4135943
    #
    # Take suitable line after name.
    # --------------------------------------------------------

    name = extract_name_from_text(
        text
    )

    name_index = None

    if name:

        for i, line in enumerate(lines):

            if line.lower() == name.lower():
                name_index = i
                break

    if name_index is not None:

        for i in range(
            name_index + 1,
            min(
                name_index + 5,
                len(lines)
            )
        ):

            candidate = lines[i]

            lower = candidate.lower()

            # Skip dates
            if re.fullmatch(
                r"\d{1,2}"
                r"(?:st|nd|rd|th)?"
                r"\s+"
                r"[A-Za-z]{3,12}"
                r"\s+"
                r"\d{4}",
                candidate,
                flags=re.IGNORECASE
            ):
                continue

            if re.fullmatch(
                r"\d{1,2}"
                r"[-/\.]"
                r"\d{1,2}"
                r"[-/\.]"
                r"\d{4}",
                candidate
            ):
                continue

            # Skip certificate ID
            if re.search(
                r"certificate\s*"
                r"(?:code|id|number|no)",
                lower
            ):
                continue

            # Skip obvious headings
            if any(
                word in lower
                for word in [
                    "certificate",
                    "congratulations",
                    "issued",
                    "awarded",
                    "date"
                ]
            ):
                continue

            course = clean_course(
                candidate
            )

            if course:
                return course

    # --------------------------------------------------------
    # Pattern 6
    # Course keyword fallback
    # --------------------------------------------------------

    course_keywords = [
        "python",
        "java",
        "javascript",
        "node.js",
        "nodejs",
        "machine learning",
        "deep learning",
        "data science",
        "data analytics",
        "artificial intelligence",
        "web development",
        "software development",
        "programming",
        "sql",
        "mongodb",
        "cloud",
        "cyber security",
        "cybersecurity",
        "devops",
        "developer",
        "development",
        "engineering"
    ]

    for line in lines:

        lower = line.lower()

        if any(
            keyword in lower
            for keyword in course_keywords
        ):

            if len(line) <= 150:

                # Don't return certificate heading
                if "certificate" not in lower:

                    course = clean_course(
                        line
                    )

                    if course:
                        return course

    return None


# ============================================================
# ORGANIZATION EXTRACTION
# ============================================================

def extract_organization_from_text(text):
    """
    Extract organization only when there is evidence.
    """

    lower = text.lower()

    known_organizations = [
        (
            "tata consultancy services",
            "Tata Consultancy Services"
        ),
        (
            "tcs ion",
            "TCS iON"
        ),
        (
            "mongodb",
            "MongoDB"
        ),
        (
            "ibm",
            "IBM"
        ),
        (
            "microsoft",
            "Microsoft"
        ),
        (
            "google",
            "Google"
        ),
        (
            "amazon web services",
            "Amazon Web Services"
        ),
        (
            "aws",
            "AWS"
        ),
        (
            "oracle",
            "Oracle"
        ),
        (
            "infosys",
            "Infosys"
        ),
        (
            "cisco",
            "Cisco"
        ),
        (
            "coursera",
            "Coursera"
        ),
        (
            "udemy",
            "Udemy"
        ),
        (
            "nptel",
            "NPTEL"
        ),
        (
            "simplilearn",
            "Simplilearn"
        ),
        (
            "great learning",
            "Great Learning"
        ),
        (
            "linkedin",
            "LinkedIn"
        ),
        (
            "edx",
            "edX"
        )
    ]

    for keyword, organization in known_organizations:

        if keyword in lower:
            return organization

    # --------------------------------------------------------
    # Explicit organization labels
    # --------------------------------------------------------

    patterns = [
        r"(?:organization|institution|issuer|"
        r"institute)"
        r"\s*[:\-]\s*"
        r"([A-Za-z0-9&.,'() \-]{3,100})",

        r"(?:issued\s+by|provided\s+by|"
        r"offered\s+by)"
        r"\s*[:\-]?\s*"
        r"([A-Za-z0-9&.,'() \-]{3,100})"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:

            organization = clean_organization(
                match.group(1)
            )

            if organization:
                return organization

    return None


# ============================================================
# CERTIFICATE ID EXTRACTION
# ============================================================

def extract_certificate_id(text):
    """
    Extract certificate code/ID.

    Supports:

        Certificate ID: ABC123
        Certificate code: 4135943
        Certificate No: ABC123
        Certificate Number: ABC123
        Cert ID: ABC123
        Cert Code: ABC123

    Also supports MongoDB IDs.
    """

    # --------------------------------------------------------
    # Pattern 1
    # Explicit certificate code/id/number
    # --------------------------------------------------------

    patterns = [

        r"(?:certificate|cert)"
        r"\s*"
        r"(?:id|code|number|no\.?)"
        r"\s*[:#\-]?\s*"
        r"([A-Za-z0-9][A-Za-z0-9\- ]{2,80})"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:

            value = match.group(1)

            # Stop at next known label
            value = re.split(
                r"\b(?:date|issued|issue|"
                r"organization|institution|"
                r"course|name)\b",
                value,
                maxsplit=1,
                flags=re.IGNORECASE
            )[0]

            value = normalize_identifier(
                value
            )

            if value:
                return value

    # --------------------------------------------------------
    # Pattern 2
    # MongoDB
    # --------------------------------------------------------

    match = re.search(
        r"\bMDB[A-Za-z0-9]{6,30}\b",
        text
    )

    if match:
        return match.group(0)

    # --------------------------------------------------------
    # Pattern 3
    # Generic ID
    # --------------------------------------------------------

    candidates = re.findall(
        r"\b[A-Za-z0-9][A-Za-z0-9\-]{5,40}\b",
        text
    )

    ignored = {
        "certificate",
        "programming",
        "python",
        "developer",
        "development",
        "mongodb",
        "course",
        "training"
    }

    for candidate in candidates:

        lower = candidate.lower()

        if lower in ignored:
            continue

        # Don't treat student ID as certificate ID
        if re.fullmatch(
            r"[A-Z]{2,6}\d{4,20}",
            candidate,
            flags=re.IGNORECASE
        ):
            continue

        # Prefer alphanumeric values
        if (
            re.search(
                r"[A-Za-z]",
                candidate
            )
            and
            re.search(
                r"\d",
                candidate
            )
        ):
            return normalize_identifier(
                candidate
            )

    return None


# ============================================================
# CERTIFICATE FIELD EXTRACTION
# ============================================================

def extract_certificate_fields(text):
    """
    Main certificate extraction pipeline.
    """

    if not text:
        return {
            "name": None,
            "course": None,
            "organization": None,
            "certificate_id": None,
            "start_date": None,
            "end_date": None
        }

    text = text.replace(
        "\r\n",
        "\n"
    )

    text = text.replace(
        "\r",
        "\n"
    )

    text = clean_extracted_text(
        text
    )

    name = extract_name_from_text(
        text
    )

    course = extract_course_from_text(
        text
    )

    organization = extract_organization_from_text(
        text
    )

    certificate_id = extract_certificate_id(
        text
    )

    start_date, end_date = (
        extract_start_end_dates(
            text
        )
    )

    # --------------------------------------------------------
    # ADDITIONAL CERTIFICATE LAYOUT FALLBACKS
    # --------------------------------------------------------
    # Keep the original extraction functions above intact.
    # These fallbacks only run when one of the existing
    # extractors could not find a value.

    lines = [
        normalize_spaces(line)
        for line in text.splitlines()
        if normalize_spaces(line)
    ]

    def _valid_name(value):
        value = clean_name(value)

        if not value:
            return None

        lower_value = value.lower()

        blocked_words = [
            "certificate",
            "course",
            "program",
            "training",
            "developer",
            "congratulations",
            "successfully",
            "completion",
            "issued",
            "awarded",
            "organization",
            "institution",
            "amazon web services",
            "mongodb",
            "python"
        ]

        if any(
            word in lower_value
            for word in blocked_words
        ):
            return None

        if re.search(r"\d", value):
            return None

        words = value.split()

        if not 2 <= len(words) <= 7:
            return None

        return value

    if not name:

        name_patterns = [
            r"(?:name|candidate|recipient|student\s*name|certificate\s*holder|awarded\s+to|issued\s+to)\s*[:\-]?\s*([A-Za-z][A-Za-z .'-]{1,80})",
            r"(?:this\s+is\s+to\s+certify\s+that|presented\s+to|awarded\s+to|issued\s+to)\s+([A-Za-z][A-Za-z .'-]{1,80}?)(?=\s+(?:has|for|in|on|who|successfully)\b|[,.]|$)",
            r"([A-Za-z][A-Za-z .'-]{1,80})\s+for\s+successfully\s+completing"
        ]

        for pattern in name_patterns:

            matches = re.finditer(
                pattern,
                text,
                flags=re.IGNORECASE
            )

            for match in matches:

                candidate = _valid_name(
                    match.group(1)
                )

                if candidate:
                    name = candidate
                    break

            if name:
                break

    if not name:

        # Example: HARIHARAN K URK22AI1048
        for line in lines:

            id_match = re.search(
                r"\b[A-Z]{2,8}\d{4,20}\b",
                line,
                flags=re.IGNORECASE
            )

            if id_match:

                candidate = _valid_name(
                    line[:id_match.start()].strip(" -:|")
                )

                if candidate:
                    name = candidate
                    break

    if not name:

        for index, line in enumerate(lines):

            if re.fullmatch(
                r"congratulations[!:.]?",
                line,
                flags=re.IGNORECASE
            ):

                for candidate_line in lines[index + 1:index + 4]:

                    candidate = _valid_name(
                        candidate_line
                    )

                    if candidate:
                        name = candidate
                        break

            if name:
                break

    if not course:

        course_patterns = [
            r"successfully\s+completing\s+(?:the\s+)?(.+?)(?=\s+(?:a\s+course|course\s+that|issued\s+on|dated\s+)|$)",
            r"(?:completed|completing)\s+(?:the\s+)?(.+?)(?=\s+(?:on\s+|dated\s+|and\s+received)|$)",
            r"(?:course|course\s+title|program|program\s+title|training|training\s+title|subject|title|credential)\s*[:\-]\s*(.+)",
        ]

        for pattern in course_patterns:

            match = re.search(
                pattern,
                text,
                flags=re.IGNORECASE | re.DOTALL
            )

            if not match:
                continue

            candidate = clean_course(
                match.group(1)
            )

            if candidate:
                candidate = candidate.strip(" -:|.,")

                if candidate.lower() not in {
                    "certificate",
                    "certificate of completion",
                    "congratulations"
                }:
                    course = candidate
                    break

    if not course:

        # Certificate layouts often place the course directly
        # after the recipient name or student ID.
        for index, line in enumerate(lines):

            if re.search(
                r"\b[A-Z]{2,8}\d{4,20}\b",
                line,
                flags=re.IGNORECASE
            ):

                for candidate_line in lines[index + 1:index + 5]:

                    candidate = clean_course(
                        candidate_line
                    )

                    if not candidate:
                        continue

                    if re.search(
                        r"\b(?:date|issued|certificate|code|id|number)\b",
                        candidate,
                        flags=re.IGNORECASE
                    ):
                        continue

                    if candidate.lower() in {
                        "certificate",
                        "congratulations"
                    }:
                        continue

                    course = candidate
                    break

            if course:
                break

    if not certificate_id:

        # Additional common certificate/credential labels.
        id_patterns = [
            r"(?:credential\s+id|credential\s+number|verification\s+(?:id|code)|validation\s+(?:id|code)|reference\s+(?:id|number)|serial\s+(?:no\.?|number))\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9\- ]{2,80})",
            r"(?:certificate\s+(?:id|code|number|no\.?))\s*[:#\-]?\s*([A-Za-z0-9][A-Za-z0-9\- ]{2,80})"
        ]

        for pattern in id_patterns:

            match = re.search(
                pattern,
                text,
                flags=re.IGNORECASE
            )

            if match:

                candidate = re.split(
                    r"\b(?:date|issued|issue|organization|institution|course|name)\b",
                    match.group(1),
                    maxsplit=1,
                    flags=re.IGNORECASE
                )[0]

                candidate = normalize_identifier(
                    candidate
                )

                if candidate:
                    certificate_id = candidate
                    break

    if not start_date or not end_date:

        # Support ISO dates in addition to the original formats.
        all_date_pattern = (
            r"\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,12}\s+\d{4}"
            r"|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}"
            r"|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}"
        )

        found_dates = []

        for match in re.finditer(
            all_date_pattern,
            text,
            flags=re.IGNORECASE
        ):

            value = normalize_spaces(
                match.group(0)
            )

            if value not in found_dates:
                found_dates.append(value)

        if not start_date:

            label_match = re.search(
                r"(?:date\s+of\s+(?:issue|issuance|completion|achievement)|issued\s+on|issue\s+date|completion\s+date|completed\s+on|awarded\s+on)\s*[:\-]?\s*("
                + all_date_pattern
                + r")",
                text,
                flags=re.IGNORECASE
            )

            if label_match:
                start_date = label_match.group(1)

        if not start_date and found_dates:
            start_date = found_dates[0]

        if not end_date and len(found_dates) >= 2:
            end_date = found_dates[1]

        if start_date and not end_date:
            end_date = start_date

    return {
        "name": name,
        "course": course,
        "organization": organization,
        "certificate_id": certificate_id,
        "start_date": start_date,
        "end_date": end_date
    }


# ============================================================
# COMPLETENESS
# ============================================================

def calculate_completeness(fields):
    """
    Certificate field completeness.

    Six fields:
        name
        course
        organization
        certificate_id
        start_date
        end_date
    """

    required_fields = [
        "name",
        "course",
        "organization",
        "certificate_id",
        "start_date",
        "end_date"
    ]

    found = 0

    for field in required_fields:

        value = fields.get(
            field
        )

        if (
            value is not None
            and str(value).strip()
        ):
            found += 1

    return round(
        (
            found /
            len(required_fields)
        ) * 100,
        2
    )


# ============================================================
# CONSISTENCY
# ============================================================

def calculate_consistency(
    fields,
    text
):
    """
    Internal consistency score.

    This does NOT prove authenticity.

    Checks:
        - course
        - organization
        - certificate ID
        - dates
    """

    score = 0
    total = 4

    if fields.get(
        "course"
    ):
        score += 1

    if fields.get(
        "organization"
    ):
        score += 1

    if fields.get(
        "certificate_id"
    ):
        score += 1

    if (
        fields.get("start_date")
        and
        fields.get("end_date")
    ):
        score += 1

    return round(
        (
            score /
            total
        ) * 100,
        2
    )


# ============================================================
# AUTHENTICITY INDICATOR
# ============================================================

def calculate_authenticity(
    fields,
    classification_confidence,
    text
):
    """
    Structural authenticity indicator.

    IMPORTANT:
    This is NOT proof that the document is genuine.

    It measures available structural evidence.
    """

    score = 0

    # Name
    if fields.get(
        "name"
    ):
        score += 20

    # Course
    if fields.get(
        "course"
    ):
        score += 20

    # Organization
    if fields.get(
        "organization"
    ):
        score += 20

    # Certificate ID
    if fields.get(
        "certificate_id"
    ):
        score += 20

    # Start date
    if fields.get(
        "start_date"
    ):
        score += 10

    # End date
    if fields.get(
        "end_date"
    ):
        score += 10

    return round(
        float(score),
        2
    )


# ============================================================
# TAMPER ANALYSIS
# ============================================================

def calculate_tamper_score(
    file_path
):
    """
    Run the existing ML tamper detector.

    Returns a detailed dictionary so the API/UI can distinguish:
        - no basic indicators
        - low/moderate/high risk
        - detector unavailable
        - detector execution failure

    IMPORTANT:
    This is an AI/basic tamper indication, not forensic proof
    that a document is genuine.
    """

    authenticity_script = os.path.join(
        ML_DIR,
        "authenticity.py"
    )

    if not os.path.exists(
        authenticity_script
    ):
        return {
            "score": 0.0,
            "status": "UNAVAILABLE",
            "suspicious_indicators": [],
            "checks": [
                "ml/authenticity.py was not found"
            ],
            "detector": "ml/authenticity.py",
            "error": "Tamper detector script not found"
        }

    try:

        output = run_command([
            sys.executable,
            authenticity_script,
            file_path
        ])

    except Exception as error:

        return {
            "score": 0.0,
            "status": "FAILED",
            "suspicious_indicators": [],
            "checks": [],
            "detector": "ml/authenticity.py",
            "error": str(error)
        }

    if output is None:
        output = ""

    output = str(output)

    score = None

    score_patterns = [
        r"Tamper\s+score\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*%?",
        r"tamper_score\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)",
        r"tamper\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)\s*%?"
    ]

    for pattern in score_patterns:

        match = re.search(
            pattern,
            output,
            flags=re.IGNORECASE
        )

        if match:

            score = float(
                match.group(1)
            )
            break

    if score is None:
        return {
            "score": 0.0,
            "status": "NO SCORE RETURNED",
            "suspicious_indicators": [],
            "checks": [
                line.strip()
                for line in output.splitlines()
                if line.strip()
            ],
            "detector": "ml/authenticity.py",
            "error": "Tamper detector did not return a readable score"
        }

    score = max(
        0.0,
        min(100.0, score)
    )

    suspicious_indicators = []
    checks = []

    negative_phrases = (
        "no tamper",
        "no tampering",
        "not detected",
        "no suspicious",
        "clean document",
        "no manipulation",
        "no alteration"
    )

    for raw_line in output.splitlines():

        line = raw_line.strip()

        if not line:
            continue

        lower_line = line.lower()

        if any(
            phrase in lower_line
            for phrase in negative_phrases
        ):
            checks.append(line)
            continue

        if any(
            keyword in lower_line
            for keyword in [
                "tamper",
                "suspicious",
                "manipulat",
                "altered",
                "edited",
                "forged",
                "anomal",
                "inconsisten",
                "modification"
            ]
        ):
            checks.append(line)

            if re.search(
                r"(?:detected|found|high|medium|moderate|suspicious|risk|indicator|possible|likely|present)",
                lower_line
            ):
                suspicious_indicators.append(line)

    if score <= 10.0:
        status = "NO BASIC TAMPER INDICATORS DETECTED"
    elif score <= 40.0:
        status = "LOW TAMPER RISK"
    elif score <= 70.0:
        status = "MODERATE TAMPER RISK"
    else:
        status = "HIGH TAMPER RISK"

    return {
        "score": round(score, 2),
        "status": status,
        "suspicious_indicators": suspicious_indicators,
        "checks": checks,
        "detector": "ml/authenticity.py",
        "error": None
    }


# ============================================================
# CERTIFICATE VERIFICATION
# ============================================================

def verify_certificate(
    file_path,
    fields,
    classification_confidence,
    text
):
    """
    Complete certificate verification.

    Signature intentionally matches:
        backend.services.verification_service

    The original scoring model is preserved. Detailed analysis
    objects are added so the frontend can display the evidence
    behind each score.
    """

    completeness = calculate_completeness(
        fields
    )

    consistency = calculate_consistency(
        fields,
        text
    )

    authenticity = calculate_authenticity(
        fields,
        classification_confidence,
        text
    )

    tamper_result = calculate_tamper_score(
        file_path
    )

    if isinstance(
        tamper_result,
        dict
    ):
        tamper_score = float(
            tamper_result.get(
                "score",
                0.0
            )
        )
    else:
        # Backward compatibility if an older detector is used.
        tamper_score = float(
            tamper_result or 0.0
        )

        tamper_result = {
            "score": tamper_score,
            "status": (
                "NO BASIC TAMPER INDICATORS DETECTED"
                if tamper_score <= 10
                else "TAMPER RISK DETECTED"
            ),
            "suspicious_indicators": [],
            "checks": [],
            "detector": "ml/authenticity.py",
            "error": None
        }

    # Tamper score is risk.
    # Convert it into quality score.
    tamper_quality = max(
        0.0,
        100.0 - tamper_score
    )

    # --------------------------------------------------------
    # Overall
    # --------------------------------------------------------

    overall = (
        completeness
        + consistency
        + authenticity
        + tamper_quality
    ) / 4

    overall = round(
        overall,
        2
    )

    # --------------------------------------------------------
    # Status
    # --------------------------------------------------------

    if (
        completeness >= 95.0
        and consistency >= 90.0
        and authenticity >= 90.0
        and tamper_score <= 10.0
    ):

        status = "VERIFIED"

    elif overall >= 70.0:

        status = "REVIEW REQUIRED"

    else:

        status = "SUSPICIOUS"

    present_fields = []
    missing_fields = []

    for field in [
        "name",
        "course",
        "organization",
        "certificate_id",
        "start_date",
        "end_date"
    ]:

        if fields.get(field):
            present_fields.append(field)
        else:
            missing_fields.append(field)

    details = []

    details.append(
        f"Classification confidence: {round(float(classification_confidence), 2)}%"
    )

    details.append(
        f"Certificate fields detected: {len(present_fields)}/6"
    )

    for field in present_fields:
        details.append(
            f"{field} detected"
        )

    for field in missing_fields:
        details.append(
            f"{field} is missing"
        )

    details.append(
        f"Tamper analysis: {tamper_result.get('status', 'UNKNOWN')}"
    )

    if tamper_result.get("error"):
        details.append(
            f"Tamper detector note: {tamper_result.get('error')}"
        )

    return {
        "completeness":
            completeness,

        "consistency":
            consistency,

        "authenticity":
            authenticity,

        "tamper_score":
            round(
                tamper_score,
                2
            ),

        "overall_score":
            overall,

        "status":
            status,

        "details":
            details,

        "completeness_analysis": {
            "score": completeness,
            "total_fields": 6,
            "present_count": len(present_fields),
            "missing_count": len(missing_fields),
            "present_fields": present_fields,
            "missing_fields": missing_fields
        },

        "consistency_analysis": {
            "score": consistency,
            "checked_fields": [
                "course",
                "organization",
                "certificate_id",
                "dates"
            ],
            "inconsistent_fields": [],
            "checks": [
                "Course presence check",
                "Organization presence check",
                "Certificate ID presence check",
                "Start/end date consistency check"
            ]
        },

        "authenticity_analysis": {
            "score": authenticity,
            "checks": [
                "Certificate holder name evidence",
                "Course/title evidence",
                "Organization/issuer evidence",
                "Certificate ID evidence",
                "Start date evidence",
                "End date evidence"
            ],
            "passed_checks": len(present_fields),
            "total_checks": 6
        },

        "tamper_analysis": tamper_result
    }


def verify_resume(
    text,
    file_path=None,
    classification_confidence=0.0
):
    """
    Complete resume verification.

    Uses the existing resume extractor when available and
    falls back to direct text detection when necessary.

    Returns:
        fields
        sections_detected
        verification
    """

    # ========================================================
    # EMPTY DOCUMENT
    # ========================================================

    if not text or not text.strip():

        return {
            "fields": {
                "name": None,
                "email": None,
                "phone": None,
                "linkedin": None,
                "github": None,
                "professional_summary": None,
                "education": [],
                "work_experience": [],
                "projects": [],
                "skills": [],
                "certifications": [],
                "achievements": []
            },

            "sections_detected": {
                "contact": False,
                "education": False,
                "experience": False,
                "skills": False,
                "projects": False,
                "certifications": False,
                "achievements": False
            },

            "verification": {
                "completeness": 0.0,
                "consistency": 0.0,
                "authenticity": 0.0,
                "tamper_score": 0.0,
                "overall_score": 0.0,
                "status": "UNREADABLE",
                "details": [
                    "Resume text is empty"
                ]
            }
        }

    # ========================================================
    # NORMALIZE TEXT
    # ========================================================

    text = str(text)

    lower = text.lower()

    # ========================================================
    # DEFAULT FIELDS
    # ========================================================

    fields = {
        "name": None,
        "email": None,
        "phone": None,
        "linkedin": None,
        "github": None,
        "professional_summary": None,
        "education": [],
        "work_experience": [],
        "projects": [],
        "skills": [],
        "certifications": [],
        "achievements": []
    }

    # ========================================================
    # TRY EXISTING RESUME EXTRACTOR
    # ========================================================

    extractor_result = None

    try:

        from backend.ai.resume_extractor import (
            extract_resume_fields
        )

        extractor_result = extract_resume_fields(
            text
        )

    except Exception:

        extractor_result = None

    # ========================================================
    # USE EXTRACTOR RESULT
    # ========================================================

    if isinstance(
        extractor_result,
        dict
    ):

        for key in fields:

            if key not in extractor_result:
                continue

            value = extractor_result.get(
                key
            )

            if value is None:
                continue

            if isinstance(
                fields[key],
                list
            ):

                if isinstance(
                    value,
                    list
                ):
                    fields[key] = value

                elif isinstance(
                    value,
                    str
                ) and value.strip():

                    fields[key] = [
                        value.strip()
                    ]

            else:

                fields[key] = value

    # ========================================================
    # EMAIL FALLBACK
    # ========================================================

    if not fields["email"]:

        match = re.search(
            r"\b[A-Za-z0-9._%+-]+"
            r"@[A-Za-z0-9.-]+\."
            r"[A-Za-z]{2,}\b",
            text
        )

        if match:

            fields["email"] = (
                match.group(0)
            )

    # ========================================================
    # PHONE FALLBACK
    # ========================================================

    if not fields["phone"]:

        match = re.search(
            r"(?:\+91[\s\-]?)?"
            r"[6-9]\d{9}\b",
            text
        )

        if match:

            fields["phone"] = (
                match.group(0)
            )

    # ========================================================
    # LINKEDIN FALLBACK
    # ========================================================

    if not fields["linkedin"]:

        match = re.search(
            r"(?:https?://)?"
            r"(?:www\.)?"
            r"linkedin\.com/in/"
            r"[A-Za-z0-9_\-]+",
            text,
            flags=re.IGNORECASE
        )

        if match:

            fields["linkedin"] = (
                match.group(0)
            )

    # ========================================================
    # GITHUB FALLBACK
    # ========================================================

    if not fields["github"]:

        match = re.search(
            r"(?:https?://)?"
            r"(?:www\.)?"
            r"github\.com/"
            r"[A-Za-z0-9_\-]+",
            text,
            flags=re.IGNORECASE
        )

        if match:

            fields["github"] = (
                match.group(0)
            )

    # ========================================================
    # NAME FALLBACK
    # ========================================================

    if not fields["name"]:

        lines = [
            normalize_spaces(
                line
            )
            for line in text.splitlines()
            if normalize_spaces(line)
        ]

        ignored = {
            "resume",
            "curriculum vitae",
            "cv",
            "profile",
            "professional summary",
            "summary",
            "education",
            "experience",
            "work experience",
            "projects",
            "skills",
            "certifications",
            "achievements"
        }

        for line in lines[:15]:

            clean = line.strip()

            if (
                clean.lower()
                in ignored
            ):
                continue

            if "@" in clean:
                continue

            if "linkedin" in clean.lower():
                continue

            if "github" in clean.lower():
                continue

            if re.search(
                r"\d{5,}",
                clean
            ):
                continue

            words = clean.split()

            if 2 <= len(words) <= 5:

                if all(
                    re.match(
                        r"^[A-Za-z.\-']+$",
                        word
                    )
                    for word in words
                ):

                    fields["name"] = clean
                    break

    # ========================================================
    # SECTION DETECTION
    # ========================================================

    sections = {

        "professional_summary": (
            "professional summary" in lower
            or "profile summary" in lower
            or "career summary" in lower
            or re.search(
                r"\bsummary\b",
                lower
            ) is not None
            or "objective" in lower
        ),

        "education": (
            "education" in lower
            or "academic background" in lower
            or "academic qualification" in lower
            or "educational qualification" in lower
        ),

        "work_experience": (
            "work experience" in lower
            or "professional experience" in lower
            or "employment" in lower
            or re.search(
                r"\bexperience\b",
                lower
            ) is not None
        ),

        "projects": (
            "projects" in lower
            or re.search(
                r"\bproject\b",
                lower
            ) is not None
        ),

        "skills": (
            "skills" in lower
            or "technical skills" in lower
            or "technical expertise" in lower
        ),

        "certifications": (
            "certifications" in lower
            or "certification" in lower
            or "licenses" in lower
        ),

        "achievements": (
            "achievements" in lower
            or "achievement" in lower
            or "awards" in lower
            or "honors" in lower
            or "honours" in lower
        )
    }

    # ========================================================
    # CONTACT SECTION
    # ========================================================

    contact_detected = bool(
        fields["name"]
        or fields["email"]
        or fields["phone"]
        or fields["linkedin"]
        or fields["github"]
    )

    sections_detected = {

        "contact":
            contact_detected,

        "education":
            bool(
                fields["education"]
            ) or sections["education"],

        "experience":
            bool(
                fields["work_experience"]
            ) or sections["work_experience"],

        "skills":
            bool(
                fields["skills"]
            ) or sections["skills"],

        "projects":
            bool(
                fields["projects"]
            ) or sections["projects"],

        "certifications":
            bool(
                fields["certifications"]
            ) or sections["certifications"],

        "achievements":
            bool(
                fields["achievements"]
            ) or sections["achievements"],

        "professional_summary":
            bool(
                fields["professional_summary"]
            ) or sections["professional_summary"]
    }

    # ========================================================
    # REQUIRED RESUME FIELDS
    # ========================================================

    required_fields = [
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

    # ========================================================
    # COMPLETENESS
    # ========================================================

    present_fields = []
    missing_fields = []

    for field in required_fields:

        value = fields.get(
            field
        )

        if isinstance(
            value,
            list
        ):

            present = (
                len(value) > 0
            )

        else:

            present = bool(
                value
            )

        if present:

            present_fields.append(
                field
            )

        else:

            missing_fields.append(
                field
            )

    total_fields = len(
        required_fields
    )

    present_count = len(
        present_fields
    )

    missing_count = len(
        missing_fields
    )

    completeness = round(
        (
            present_count /
            total_fields
        ) * 100,
        2
    )

    # ========================================================
    # CONSISTENCY CHECK
    # ========================================================

    consistency_checks = []
    inconsistent_fields = []

    identifier_fields = [
        "name",
        "email",
        "phone",
        "linkedin",
        "github"
    ]

    for field in identifier_fields:

        value = fields.get(
            field
        )

        if not value:

            continue

        value_string = str(
            value
        ).strip()

        if not value_string:

            continue

        if (
            value_string.lower()
            in lower
        ):

            consistency_checks.append(
                f"{field} is consistent with document text"
            )

        else:

            inconsistent_fields.append(
                field
            )

            consistency_checks.append(
                f"{field} is inconsistent with document text"
            )

    if consistency_checks:

        consistency = round(
            (
                len(
                    consistency_checks
                )
                -
                len(
                    inconsistent_fields
                )
            )
            /
            len(
                consistency_checks
            )
            * 100,
            2
        )

    else:

        consistency = 0.0

    # ========================================================
    # AUTHENTICITY
    # ========================================================

    authenticity_checks = []

    if len(text.strip()) > 50:

        authenticity_checks.append(
            "Resume contains meaningful extracted content"
        )

    if fields["name"]:

        authenticity_checks.append(
            "Resume contains a name"
        )

    if fields["email"]:

        authenticity_checks.append(
            "Resume contains an email address"
        )

    if fields["phone"]:

        authenticity_checks.append(
            "Resume contains a phone number"
        )

    total_authenticity_checks = 4

    authenticity = round(
        (
            len(
                authenticity_checks
            )
            /
            total_authenticity_checks
        )
        * 100,
        2
    )

    # ========================================================
    # TAMPER ANALYSIS
    # ========================================================

    suspicious_indicators = []

    if text.count(
        "\ufffd"
    ) > 20:

        suspicious_indicators.append(
            "Large amount of corrupted text detected"
        )

    if (
        "\x00" in text
    ):

        suspicious_indicators.append(
            "Null characters detected"
        )

    # Keep the original text-level checks. When the original
    # document path is available, also run the existing ML
    # tamper detector and expose its detailed result.
    tamper_analysis = {
        "score": 0.0,
        "status": "No basic tamper indicators detected",
        "suspicious_indicators": [],
        "checks": [],
        "detector": "text-level checks only",
        "error": None
    }

    if file_path:

        detected_tamper = calculate_tamper_score(
            file_path
        )

        if isinstance(
            detected_tamper,
            dict
        ):
            tamper_analysis = detected_tamper
            suspicious_indicators.extend(
                detected_tamper.get(
                    "suspicious_indicators",
                    []
                )
            )

            tamper_score = float(
                detected_tamper.get(
                    "score",
                    0.0
                )
            )

            tamper_status = str(
                detected_tamper.get(
                    "status",
                    "UNKNOWN"
                )
            )
        else:
            tamper_score = float(
                detected_tamper or 0.0
            )
            tamper_status = (
                "No basic tamper indicators detected"
                if tamper_score <= 10
                else "Tamper risk detected"
            )
    elif suspicious_indicators:

        tamper_score = 100.0

        tamper_status = (
            "Suspicious indicators detected"
        )

    else:

        tamper_score = 0.0

        tamper_status = (
            "No basic tamper indicators detected"
        )

    if suspicious_indicators and tamper_score < 100.0:
        # Preserve a strong text-level signal if corrupted/null
        # content was found, without hiding the ML detector result.
        tamper_score = max(
            tamper_score,
            100.0
        )
        tamper_status = "Suspicious indicators detected"

    tamper_analysis["score"] = tamper_score
    tamper_analysis["status"] = tamper_status
    tamper_analysis["suspicious_indicators"] = suspicious_indicators

    # ========================================================
    # OVERALL SCORE
    # ========================================================

    overall_score = round(
        (
            completeness
            +
            consistency
            +
            authenticity
            +
            (100.0 - tamper_score)
        )
        / 4,
        2
    )

    # ========================================================
    # STATUS
    # ========================================================

    if overall_score >= 80:

        status = "VERIFIED"

    elif overall_score >= 60:

        status = "REVIEW REQUIRED"

    else:

        status = "FAILED"

    # ========================================================
    # DETAILS
    # ========================================================

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

    details.append(
        f"Tamper analysis: {tamper_status}"
    )

    # ========================================================
    # FINAL RESULT
    # ========================================================

    return {

        "fields":
            fields,

        "sections_detected":
            sections_detected,

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
                    present_count,

                "missing_count":
                    missing_count,

                "present_fields":
                    present_fields,

                "missing_fields":
                    missing_fields
            },

            "consistency_analysis": {

                "score":
                    consistency,

                "checked_fields":
                    identifier_fields,

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
                    len(
                        authenticity_checks
                    ),

                "total_checks":
                    total_authenticity_checks
            },

            "tamper_analysis": tamper_analysis
        }
    }
def verify_generic(
    document_type,
    text
):
    """
    Generic analysis for unsupported document
    categories.
    """

    text_length = len(
        text.strip()
    ) if text else 0

    if text_length > 0:

        status = (
            "DOCUMENT DETECTED"
        )

    else:

        status = (
            "UNREADABLE"
        )

    return {
        "verification": {

            "text_extracted":
                text_length > 0,

            "text_length":
                text_length,

            "status":
                status
        }
    }


# ============================================================
# MAIN DOCUMENT PIPELINE
# ============================================================

def verify_document(
    document_path
):
    """
    Standalone verification pipeline.

    Used by:

        python backend/verify.py file.pdf
    """

    validate_file(
        document_path
    )

    print(
        "\n" + "=" * 60
    )

    print(
        "       AI DOCUMENT & IMAGE VERIFICATION"
    )

    print(
        "=" * 60
    )

    print(
        f"\nDocument: {document_path}"
    )

    # ========================================================
    # STEP 1 - OCR
    # ========================================================

    print(
        "\n[1/5] Running OCR / document extraction..."
    )

    ocr_text = extract_text(
        document_path
    )

    if not ocr_text:
        raise RuntimeError(
            "No text could be extracted."
        )

    # ========================================================
    # STEP 2 - CLASSIFICATION
    # ========================================================

    print(
        "[2/5] Classifying document..."
    )

    document_type, classification_confidence = (
        classify_document(
            ocr_text
        )
    )

    print(
        f"Document Type : "
        f"{document_type}"
    )

    print(
        f"Classification Confidence : "
        f"{classification_confidence}%"
    )
    print(
        "[3/5] Running LayoutLMv3 Document AI..."
    )

    layoutlm_result = run_layoutlm_analysis(
        file_path
    )
    # ========================================================
    # DOCUMENT ROUTING
    # ========================================================

    if document_type == "CERTIFICATE":

        print(
            "[4/5] Running certificate NLP..."
        )

        fields = extract_certificate_fields(
            ocr_text
        )

        print(
            "[5/5] Running certificate verification..."
        )

        verification = verify_certificate(
            document_path,
            fields,
            classification_confidence,
            ocr_text
        )

        result = {

            "fields":
                fields,

            "verification":
                verification
        }

    elif document_type == "RESUME":

        print(
            "[4/5] Running resume NLP..."
        )

        print(
            "[5/5] Running resume completeness analysis..."
        )

        result = verify_resume(
            ocr_text
        )

    else:

        print(
            "[4/5] Running generic document analysis..."
        )

        print(
            "[5/5] Running generic completeness analysis..."
        )

        result = verify_generic(
            document_type,
            ocr_text
        )

    # ========================================================
    # FINAL RESULT
    # ========================================================

    result["document_type"] = (
        document_type
    )

    result["classification_confidence"] = (
        classification_confidence
    )

    result["document"] = (
        os.path.basename(
            document_path
        )
    )

    print(
        "\n" + "=" * 60
    )

    print(
        "             FINAL RESULT"
    )

    print(
        "=" * 60
    )

    print(
        f"\nDocument Type : "
        f"{document_type}"
    )

    print(
        f"Classification Confidence : "
        f"{classification_confidence}%"
    )

    print(
        "\nJSON RESULT"
    )

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )

    return result

# ============================================================
# LAYOUTLMV3 ANALYSIS
# ============================================================

def run_layoutlm_analysis(file_path):

    """
    Run LayoutLMv3 Document AI analysis.

    LayoutLMv3 is used as an additional
    document-understanding layer.

    It does NOT independently decide whether
    a document is genuine or fake.
    """

    if not LAYOUTLM_AVAILABLE:

        return {
            "status": "unavailable",
            "model": "microsoft/layoutlmv3-base",
            "message":
                "LayoutLMv3 is not available"
        }

    if not os.path.exists(file_path):

        return {
            "status": "failed",
            "model": "microsoft/layoutlmv3-base",
            "message":
                "File not found"
        }

    extension = os.path.splitext(
        file_path
    )[1].lower()

    # --------------------------------------------------------
    # IMAGE
    # --------------------------------------------------------

    if extension in [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    ]:

        try:

            result = analyze_document(
                file_path
            )

            return result

        except Exception as error:

            return {
                "status": "failed",
                "model":
                    "microsoft/layoutlmv3-base",
                "message": str(error)
            }

    # --------------------------------------------------------
    # PDF
    # --------------------------------------------------------

    if extension == ".pdf":

        try:

            import fitz

            pdf = fitz.open(
                file_path
            )

            if len(pdf) == 0:

                return {
                    "status": "failed",
                    "model":
                        "microsoft/layoutlmv3-base",
                    "message":
                        "PDF contains no pages"
                }

            page = pdf[0]

            pix = page.get_pixmap(
                matrix=fitz.Matrix(
                    2,
                    2
                )
            )

            temp_image = os.path.join(
                os.path.dirname(file_path),
                "_layoutlm_temp.png"
            )

            pix.save(
                temp_image
            )

            pdf.close()

            try:

                result = analyze_document(
                    temp_image
                )

            finally:

                if os.path.exists(
                    temp_image
                ):

                    os.remove(
                        temp_image
                    )

            result["source_file"] = os.path.basename(
                file_path
            )

            result["processed_page"] = 1

            return result

        except Exception as error:

            return {
                "status": "failed",
                "model":
                    "microsoft/layoutlmv3-base",
                "message": str(error)
            }

    # --------------------------------------------------------
    # UNSUPPORTED
    # --------------------------------------------------------

    return {
        "status": "skipped",
        "model":
            "microsoft/layoutlmv3-base",
        "message":
            "LayoutLMv3 supports image-based analysis"
    }
# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) != 2:

        print(
            "\nUsage:"
        )

        print(
            "python backend/verify.py "
            "<document_path>"
        )

        print(
            "\nExamples:"
        )

        print(
            "python backend/verify.py "
            "ml/test_images/certificate.jpg"
        )

        print(
            "python backend/verify.py "
            "ml/test_images/certificate6.pdf"
        )

        print(
            "python backend/verify.py "
            "ml/test_images/1.pdf"
        )

        sys.exit(1)

    document_path = sys.argv[1]

    try:

        verify_document(
            document_path
        )

    except Exception as error:

        print(
            f"\nERROR: {error}"
        )

        sys.exit(1)