import re
import sys
from transformers import pipeline


# ============================================================
# NER MODEL
# ============================================================

ner = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple"
)


# ============================================================
# GENERIC NER
# ============================================================

def extract_nlp_entities(text):
    results = ner(text)

    entities = []

    for item in results:
        entities.append({
            "text": item["word"].strip(),
            "label": item["entity_group"],
            "confidence": round(float(item["score"]), 4)
        })

    return entities


# ============================================================
# CLEAN TEXT
# ============================================================

def clean_text(text):
    """
    Normalize OCR/PDF text without destroying useful
    line structure.
    """

    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    lines = []

    for line in text.split("\n"):
        line = line.strip()

        if line:
            lines.append(line)

    return "\n".join(lines)


# ============================================================
# NAME EXTRACTION
# ============================================================

def extract_certificate_name(text, ner_entities):
    """
    Certificate-specific name extraction.

    Handles both:

        HARIHARAN K

    and:

        HARIHARAN K URK22AI1048

    The second value is treated as a student/registration
    identifier, not part of the person's name.
    """

    lines = text.splitlines()

    # --------------------------------------------------------
    # 1. Strong certificate-specific pattern
    # --------------------------------------------------------

    for line in lines:

        line = line.strip()

        if not line:
            continue

        # Example:
        # HARIHARAN K URK22AI1048
        #
        # Name = HARIHARAN K
        # ID   = URK22AI1048

        match = re.match(
            r"^([A-Z][A-Z .'-]{2,40}?)\s+"
            r"([A-Z]{2,8}\d{2,12})$",
            line
        )

        if match:

            name = match.group(1).strip()

            # Avoid treating obvious non-name text as a name
            if not is_invalid_name(name):

                return name

    # --------------------------------------------------------
    # 2. Look for a standalone uppercase name
    # --------------------------------------------------------

    for line in lines:

        line = line.strip()

        if not line:
            continue

        # Typical certificate name:
        # HARIHARAN K
        #
        # 2-5 words, mostly uppercase.

        if re.fullmatch(
            r"[A-Z][A-Z .'-]{2,50}",
            line
        ):

            if is_invalid_name(line):

                continue

            words = line.split()

            if 1 <= len(words) <= 5:

                return line

    # --------------------------------------------------------
    # 3. Use NER as fallback
    # --------------------------------------------------------

    for entity in ner_entities:

        label = entity["label"]
        value = entity["text"].strip()

        if label == "PER":

            if not is_invalid_name(value):

                return value

    # --------------------------------------------------------
    # 4. NER sometimes incorrectly marks the name as ORG.
    #    Use the first line containing a human-name pattern.
    # --------------------------------------------------------

    for entity in ner_entities:

        value = entity["text"].strip()

        if not value:
            continue

        if is_probable_person_name(value):

            return value

    return None


# ============================================================
# NAME VALIDATION
# ============================================================

def is_invalid_name(value):
    """
    Reject obvious organization / certificate wording.
    """

    value_upper = value.upper().strip()

    invalid_words = [
        "TATA",
        "CONSULTANCY",
        "SERVICES",
        "MONGODB",
        "CERTIFICATE",
        "ACHIEVEMENT",
        "CONGRATULATIONS",
        "GLOBAL",
        "DELIVERY",
        "HEAD",
        "CERTIFIED",
        "COURSE",
        "SKILLS",
        "OBJECTIVES",
        "IMPORTANCE",
        "ACQUIRING",
        "DIFFERENCE",
        "HARD",
        "SOFT"
    ]

    for word in invalid_words:

        if word in value_upper.split():

            return True

    return False


def is_probable_person_name(value):
    """
    Detect names such as:

        HARIHARAN K
        JOHN SMITH
        PRIYA S
    """

    value = value.strip()

    if not value:
        return False

    if len(value) > 60:
        return False

    # Must contain letters
    if not re.search(r"[A-Za-z]", value):
        return False

    # Remove tokenizer artifacts
    value = value.replace("##", "")

    words = value.split()

    if not (1 <= len(words) <= 5):
        return False

    # Reject obvious long organizational strings
    if is_invalid_name(value):
        return False

    # Person names normally consist of alphabetic words,
    # optionally with a single-letter initial.
    for word in words:

        word = word.strip(".,'-")

        if not re.fullmatch(
            r"[A-Za-z]{1,30}",
            word
        ):
            return False

    return True


# ============================================================
# ORGANIZATION EXTRACTION
# ============================================================

def extract_organization(text, ner_entities):
    """
    Extract organization.

    Prefer explicit/common organization patterns over noisy
    NER output.
    """

    # --------------------------------------------------------
    # Known organization names
    # --------------------------------------------------------

    known_organizations = [
        "Tata Consultancy Services",
        "MongoDB",
        "Microsoft",
        "Google",
        "Amazon",
        "IBM",
        "Infosys",
        "Wipro",
        "Accenture",
        "Deloitte"
    ]

    text_lower = text.lower()

    for organization in known_organizations:

        if organization.lower() in text_lower:

            return organization

    # --------------------------------------------------------
    # NER fallback
    # --------------------------------------------------------

    for entity in ner_entities:

        if entity["label"] != "ORG":
            continue

        value = entity["text"].strip()

        if not value:
            continue

        if is_invalid_organization(value):
            continue

        return value

    return None


def is_invalid_organization(value):

    value_upper = value.upper().strip()

    invalid = [
        "HARIHARAN",
        "CERTIFICATE",
        "ACHIEVEMENT",
        "SKILLS",
        "COURSE",
        "WEB",
        "MEHUL",
        "CONGRATULATIONS"
    ]

    for word in invalid:

        if word in value_upper:

            return True

    return False


# ============================================================
# CERTIFICATE ID EXTRACTION
# ============================================================

def extract_certificate_id(text):
    """
    Extract the actual certificate ID.

    Examples:

        Cert ID: 66790-25861 468-1016
        MDBdnfm30o3ze

    Important:
    URK22AI1048 is NOT treated as the certificate ID when
    MDBdnfm30o3ze is present.
    """

    # --------------------------------------------------------
    # 1. Explicit Cert ID
    # --------------------------------------------------------

    explicit_patterns = [
        r"Cert\s*ID\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\- ]{3,60})",
        r"Certificate\s*ID\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\- ]{3,60})",
        r"Credential\s*ID\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\- ]{3,60})"
    ]

    for pattern in explicit_patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            raw = match.group(1)

            # Stop at a likely next field
            raw = re.split(
                r"\b(?:Tata|Consultancy|Services|AVP|date)\b",
                raw,
                flags=re.IGNORECASE
            )[0]

            cleaned = re.sub(
                r"[^A-Za-z0-9\-]",
                "",
                raw
            )

            if cleaned:

                return cleaned

    # --------------------------------------------------------
    # 2. MongoDB-style certificate ID
    # --------------------------------------------------------

    # Example:
    # MDBdnfm30o3ze

    mongo_match = re.search(
        r"\bMDB[A-Za-z0-9]{6,30}\b",
        text
    )

    if mongo_match:

        return mongo_match.group(0)

    # --------------------------------------------------------
    # 3. Generic alphanumeric credential
    # --------------------------------------------------------

    candidates = re.findall(
        r"\b[A-Za-z]{2,8}[A-Za-z0-9]{4,30}\b",
        text
    )

    for candidate in candidates:

        upper = candidate.upper()

        # Do not use obvious student/register IDs
        if re.fullmatch(
            r"[A-Z]{2,8}\d{2,12}",
            candidate
        ):
            continue

        # Skip common words
        if upper in {
            "HARIHARAN",
            "MONGODB",
            "CONSULTANCY",
            "SERVICES",
            "CERTIFICATE"
        }:
            continue

        return candidate

    return None


# ============================================================
# COURSE EXTRACTION
# ============================================================

def extract_course(text):
    """
    Extract course from common certificate wording.
    """

    # --------------------------------------------------------
    # Pattern:
    #
    # for successfully completing
    # Introduction to Soft Skills
    # --------------------------------------------------------

    match = re.search(
        r"successfully\s+completing\s*"
        r"(?:\n|\r\n|\s)+"
        r"([^\n\r]+)",
        text,
        re.IGNORECASE
    )

    if match:

        course = match.group(1).strip()

        if is_valid_course(course):

            return course

    # --------------------------------------------------------
    # MongoDB-style certificate
    #
    # HARIHARAN K URK22AI1048
    # MongoDB Node.js Developer Path
    # MDBdnfm30o3ze
    # --------------------------------------------------------

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    for index, line in enumerate(lines):

        if "path" in line.lower():

            if is_valid_course(line):

                return line

        if "course" in line.lower():

            # Example:
            # Course: Python Programming

            parts = re.split(
                r"[:\-]",
                line,
                maxsplit=1
            )

            if len(parts) == 2:

                course = parts[1].strip()

                if is_valid_course(course):

                    return course

    # --------------------------------------------------------
    # Noun phrase fallback
    # --------------------------------------------------------

    for line in lines:

        if is_valid_course(line):

            if any(
                word in line.lower()
                for word in [
                    "developer",
                    "development",
                    "programming",
                    "soft skills",
                    "data",
                    "python",
                    "java",
                    "javascript",
                    "node.js",
                    "machine learning",
                    "artificial intelligence"
                ]
            ):

                return line

    return None


def is_valid_course(value):

    if not value:
        return False

    value = value.strip()

    if len(value) < 3:
        return False

    if len(value) > 150:
        return False

    # Not a date
    if re.fullmatch(
        r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}",
        value
    ):
        return False

    return True


# ============================================================
# DATE EXTRACTION
# ============================================================

def extract_dates(text):
    """
    Extract all supported date formats.
    """

    patterns = [
        r"\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b",
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b",
        r"\b[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}\b"
    ]

    dates = []

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            re.IGNORECASE
        )

        for date in matches:

            date = date.strip()

            if date not in dates:

                dates.append(date)

    return dates


# ============================================================
# DATE RANGE
# ============================================================

def extract_date_range(text):
    """
    Extract start/end dates.

    Handles:

        Start Date: 03 Feb 2024 End Date: 03 Feb 2024

    and certificates where only one date exists:

        04-11-2024

    In a single-date certificate, the same date is used as
    both start and end.
    """

    # --------------------------------------------------------
    # Explicit start/end
    # --------------------------------------------------------

    start_match = re.search(
        r"Start\s*Date\s*[:\-]?\s*"
        r"([0-9A-Za-z,\-/ ]{6,30}?)"
        r"(?=\s+End\s*Date|\s*$)",
        text,
        re.IGNORECASE
    )

    end_match = re.search(
        r"End\s*Date\s*[:\-]?\s*"
        r"([0-9A-Za-z,\-/ ]{6,30})",
        text,
        re.IGNORECASE
    )

    start_date = None
    end_date = None

    if start_match:

        start_date = clean_date(
            start_match.group(1)
        )

    if end_match:

        end_date = clean_date(
            end_match.group(1)
        )

    # --------------------------------------------------------
    # Fallback: all dates
    # --------------------------------------------------------

    dates = extract_dates(text)

    if not start_date and dates:

        start_date = dates[0]

    if not end_date:

        if len(dates) >= 2:

            end_date = dates[1]

        elif len(dates) == 1:

            # Single-date certificate
            end_date = dates[0]

    return {
        "start_date": start_date,
        "end_date": end_date
    }


def clean_date(value):

    value = value.strip()

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    return value


# ============================================================
# CERTIFICATE ENTITY EXTRACTION
# ============================================================

def extract_certificate_entities(text):

    text = clean_text(text)

    ner_entities = extract_nlp_entities(text)

    certificate_entities = {
        "person": [],
        "organization": [],
        "date": [],
        "certificate_id": [],
        "course": []
    }

    # --------------------------------------------------------
    # PERSON
    # --------------------------------------------------------

    name = extract_certificate_name(
        text,
        ner_entities
    )

    if name:

        certificate_entities["person"].append(name)

    # --------------------------------------------------------
    # ORGANIZATION
    # --------------------------------------------------------

    organization = extract_organization(
        text,
        ner_entities
    )

    if organization:

        certificate_entities["organization"].append(
            organization
        )

    # --------------------------------------------------------
    # DATES
    # --------------------------------------------------------

    certificate_entities["date"] = extract_dates(text)

    # --------------------------------------------------------
    # CERTIFICATE ID
    # --------------------------------------------------------

    certificate_id = extract_certificate_id(text)

    if certificate_id:

        certificate_entities["certificate_id"].append(
            certificate_id
        )

    # --------------------------------------------------------
    # COURSE
    # --------------------------------------------------------

    course = extract_course(text)

    if course:

        certificate_entities["course"].append(
            course
        )

    return certificate_entities


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) < 2:

        print(
            "Usage:"
        )

        print(
            "python ml/nlp_extractor.py "
            "ml/test_images/certificate.pdf"
        )

        sys.exit(1)

    from document_extractor import extract_text

    image_path = sys.argv[1]

    # --------------------------------------------------------
    # Extract document text
    # --------------------------------------------------------

    text = extract_text(image_path)

    text = clean_text(text)

    print("\n========== OCR TEXT ==========")

    print(text)

    # --------------------------------------------------------
    # NER
    # --------------------------------------------------------

    entities = extract_nlp_entities(text)

    print("\n========== NER ENTITIES ==========")

    for entity in entities:

        print(
            f"{entity['label']:5} | "
            f"{entity['text']} | "
            f"{entity['confidence']}"
        )

    # --------------------------------------------------------
    # Certificate extraction
    # --------------------------------------------------------

    certificate = extract_certificate_entities(text)

    print("\n========== CERTIFICATE ENTITIES ==========")

    for key, values in certificate.items():

        print(
            f"{key}: {values}"
        )

    # --------------------------------------------------------
    # Date range
    # --------------------------------------------------------

    date_range = extract_date_range(text)

    print("\n========== DATE RANGE ==========")

    print(
        f"start_date: {date_range['start_date']}"
    )

    print(
        f"end_date: {date_range['end_date']}"
    )