import re
import sys
from datetime import datetime


# ============================================================
# REQUIRED FIELDS
# ============================================================

REQUIRED_FIELDS = [
    "name",
    "course",
    "organization",
    "certificate_id",
    "start_date",
    "end_date"
]


# ============================================================
# COMMON WORDS
# ============================================================

NON_NAME_LINES = {
    "certificate",
    "certificate of achievement",
    "certificate of completion",
    "congratulations",
    "this is to certify",
    "successfully completing",
    "successfully completed",
    "a course that covers",
    "objectives",
    "course",
    "training",
    "certified",
    "date"
}


# ============================================================
# CLEANING
# ============================================================

def clean(value):

    if not value:
        return None

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    return value.strip(
        " :-|"
    )


# ============================================================
# DATE NORMALIZATION
# ============================================================

MONTHS = (
    "Jan|January|"
    "Feb|February|"
    "Mar|March|"
    "Apr|April|"
    "May|"
    "Jun|June|"
    "Jul|July|"
    "Aug|August|"
    "Sep|September|"
    "Oct|October|"
    "Nov|November|"
    "Dec|December"
)


DATE_PATTERN = (
    rf"\b"
    rf"(\d{{1,2}}"
    rf"(?:[-/\s])"
    rf"(?:{MONTHS})"
    rf"(?:[-/\s])"
    rf"\d{{4}})"
    rf"\b"
)


NUMERIC_DATE_PATTERN = (
    r"\b"
    r"(\d{1,2}[-/]\d{1,2}[-/]\d{4})"
    r"\b"
)


def normalize_date(value):

    if not value:
        return None

    value = clean(value)

    formats = [
        "%d %b %Y",
        "%d %B %Y",
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%d/%b/%Y",
        "%d/%B/%Y",
        "%d-%m-%Y",
        "%d/%m/%Y"
    ]

    for fmt in formats:

        try:

            date = datetime.strptime(
                value,
                fmt
            )

            return date.strftime(
                "%d %b %Y"
            )

        except ValueError:
            continue

    return value


# ============================================================
# DATE EXTRACTION
# ============================================================

def extract_dates(text):

    dates = []

    # Text dates
    for match in re.finditer(
        DATE_PATTERN,
        text,
        re.IGNORECASE
    ):

        value = clean(
            match.group(1)
        )

        if value:
            dates.append(
                normalize_date(value)
            )

    # Numeric dates
    for match in re.finditer(
        NUMERIC_DATE_PATTERN,
        text
    ):

        value = clean(
            match.group(1)
        )

        if value:

            normalized = normalize_date(
                value
            )

            if normalized not in dates:
                dates.append(
                    normalized
                )

    return dates


# ============================================================
# CERTIFICATE ID
# ============================================================

def extract_certificate_id(text):

    # Explicit certificate ID
    patterns = [

        r"Cert(?:ificate)?\s*ID\s*[:#-]?\s*"
        r"([A-Za-z0-9][A-Za-z0-9\-_ ]{4,})",

        r"Certificate\s*(?:No|Number)\s*[:#-]?\s*"
        r"([A-Za-z0-9][A-Za-z0-9\-_ ]{4,})",

        r"Credential\s*(?:ID|No|Number)\s*[:#-]?\s*"
        r"([A-Za-z0-9][A-Za-z0-9\-_ ]{4,})"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            value = clean(
                match.group(1)
            )

            # Stop at obvious following text
            value = re.split(
                r"\b(?:date|start|end|issued)\b",
                value,
                flags=re.IGNORECASE
            )[0]

            value = clean(
                value
            )

            if value:
                return value

    # Generic identifier detection
    lines = [
        clean(line)
        for line in text.splitlines()
        if clean(line)
    ]

    for line in lines:

        if re.fullmatch(
            r"[A-Za-z0-9][A-Za-z0-9\-_]{7,}",
            line
        ):

            # Avoid pure long words
            if (
                re.search(r"[A-Za-z]", line)
                and re.search(r"\d", line)
            ):
                return line

    return None


# ============================================================
# ORGANIZATION
# ============================================================

def extract_organization(
    text,
    lines
):

    organization_patterns = [

        r"\bTata Consultancy Services\b",

        r"\bTCS\s+iON\b",

        r"\bMongoDB\b",

        r"\bMicrosoft\b",

        r"\bGoogle\b",

        r"\bAmazon\b",

        r"\bIBM\b",

        r"\bInfosys\b",

        r"\bCoursera\b",

        r"\bUdemy\b",

        r"\bLinkedIn\b",

        r"\bKaggle\b",

        r"\bCisco\b",

        r"\bAWS\b",

        r"\bOracle\b",

        r"\bNPTEL\b"
    ]

    for pattern in organization_patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            return clean(
                match.group(0)
            )

    return None


# ============================================================
# COURSE
# ============================================================

def extract_course(
    text,
    lines
):

    # Explicit course wording
    patterns = [

        r"(?:course|training|program)"
        r"\s*(?:title|name)?\s*[:\-]\s*"
        r"([^\n]+)",

        r"successfully\s+complet(?:ing|ed)"
        r"\s+([^\n]+)",

        r"completed\s+the\s+"
        r"([^\n]+)"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            value = clean(
                match.group(1)
            )

            if value:

                value = re.split(
                    r"\ba course that\b",
                    value,
                    flags=re.IGNORECASE
                )[0]

                return clean(
                    value
                )

    # Generic certificate layout:
    # identify meaningful title-like lines.
    for line in lines:

        lower = line.lower()

        if (
            "developer path" in lower
            or "certification" in lower
            or "training" in lower
            or "course" in lower
            or "program" in lower
        ):

            if lower not in NON_NAME_LINES:

                return line

    return None


# ============================================================
# NAME
# ============================================================

def extract_name(
    text,
    lines,
    course,
    organization
):

    # --------------------------------------------------------
    # Explicit name labels
    # --------------------------------------------------------

    patterns = [

        r"(?:name|candidate|recipient|student)"
        r"\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{2,})"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            value = clean(
                match.group(1)
            )

            if value:
                return value

    # --------------------------------------------------------
    # "Congratulations!" / "awarded to" style
    # --------------------------------------------------------

    patterns = [

        r"congratulations\s*[!\-:]?\s*\n\s*"
        r"([A-Za-z][A-Za-z .'-]{2,})",

        r"awarded\s+to\s+"
        r"([A-Za-z][A-Za-z .'-]{2,})",

        r"presented\s+to\s+"
        r"([A-Za-z][A-Za-z .'-]{2,})"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            value = clean(
                match.group(1)
            )

            if value:
                return value

    # --------------------------------------------------------
    # Heuristic name detection
    # --------------------------------------------------------

    for line in lines:

        value = clean(line)

        if not value:
            continue

        lower = value.lower()

        if lower in NON_NAME_LINES:
            continue

        if course and value == course:
            continue

        if organization and value == organization:
            continue

        # Skip URLs
        if "http" in lower:
            continue

        # Skip email
        if "@" in value:
            continue

        # Skip dates
        if re.search(
            DATE_PATTERN,
            value,
            re.IGNORECASE
        ):
            continue

        if re.fullmatch(
            r"[A-Za-z][A-Za-z .'-]{2,}",
            value
        ):

            words = value.split()

            if 2 <= len(words) <= 5:

                # Avoid obvious organization/title lines
                if any(
                    word.lower()
                    in {
                        "consultancy",
                        "services",
                        "mongodb",
                        "university",
                        "institute",
                        "academy",
                        "developer",
                        "path"
                    }
                    for word in words
                ):
                    continue

                return value

    return None


# ============================================================
# FIELD EXTRACTION
# ============================================================

def extract_fields(text):

    lines = [
        clean(line)
        for line in text.splitlines()
        if clean(line)
    ]

    fields = {
        "name": None,
        "course": None,
        "organization": None,
        "certificate_id": None,
        "start_date": None,
        "end_date": None
    }

    # Course
    fields["course"] = extract_course(
        text,
        lines
    )

    # Organization
    fields["organization"] = extract_organization(
        text,
        lines
    )

    # Certificate ID
    fields["certificate_id"] = extract_certificate_id(
        text
    )

    # Name
    fields["name"] = extract_name(
        text,
        lines,
        fields["course"],
        fields["organization"]
    )

    # Dates
    dates = extract_dates(
        text
    )

    # Explicit start/end
    start_match = re.search(
        r"Start\s*Date\s*:\s*"
        r"([^\n]+)",
        text,
        re.IGNORECASE
    )

    end_match = re.search(
        r"End\s*Date\s*:\s*"
        r"([^\n]+)",
        text,
        re.IGNORECASE
    )

    if start_match:

        start_dates = extract_dates(
            start_match.group(1)
        )

        if start_dates:
            fields["start_date"] = (
                start_dates[0]
            )

    if end_match:

        end_dates = extract_dates(
            end_match.group(1)
        )

        if end_dates:
            fields["end_date"] = (
                end_dates[0]
            )

    # Generic fallback
    if not fields["start_date"] and dates:

        fields["start_date"] = dates[0]

    if (
        not fields["end_date"]
        and len(dates) >= 2
    ):

        fields["end_date"] = dates[1]

    return fields


# ============================================================
# COMPLETENESS
# ============================================================

def check_completeness(fields):

    present = sum(
        1
        for field in REQUIRED_FIELDS
        if fields.get(field)
    )

    score = (
        present /
        len(REQUIRED_FIELDS)
    ) * 100

    return round(
        score,
        2
    )


# ============================================================
# CONSISTENCY
# ============================================================

def check_consistency(fields):

    issues = []

    # Certificate ID
    if not fields["certificate_id"]:

        issues.append(
            "Certificate ID missing"
        )

    elif len(
        re.sub(
            r"[^A-Za-z0-9]",
            "",
            fields["certificate_id"]
        )
    ) < 5:

        issues.append(
            "Certificate ID appears invalid"
        )

    # Dates
    if (
        fields["start_date"]
        and fields["end_date"]
    ):

        try:

            start = datetime.strptime(
                fields["start_date"],
                "%d %b %Y"
            )

            end = datetime.strptime(
                fields["end_date"],
                "%d %b %Y"
            )

            if start > end:

                issues.append(
                    "Start date is after end date"
                )

        except ValueError:

            issues.append(
                "Date format could not be validated"
            )

    else:

        if not fields["start_date"]:

            issues.append(
                "Start date missing"
            )

        if not fields["end_date"]:

            issues.append(
                "End date missing"
            )

    # Score
    if not issues:

        score = 100

    else:

        score = max(
            0,
            100 - (
                len(issues) * 25
            )
        )

    return {
        "score": score,
        "issues": issues
    }


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) != 2:

        print(
            "Usage: python ml/verification.py <text_file>"
        )

        sys.exit(1)

    text_file = sys.argv[1]

    try:

        with open(
            text_file,
            "r",
            encoding="utf-8"
        ) as file:

            text = file.read()

    except Exception as error:

        print(
            f"ERROR: {error}"
        )

        sys.exit(1)

    fields = extract_fields(
        text
    )

    completeness = check_completeness(
        fields
    )

    consistency = check_consistency(
        fields
    )

    print(
        "\n========== EXTRACTED FIELDS =========="
    )

    for key, value in fields.items():

        print(
            f"{key}: {value}"
        )

    print(
        "\n========== VERIFICATION =========="
    )

    print(
        f"Completeness: "
        f"{completeness}%"
    )

    print(
        f"Consistency: "
        f"{consistency['score']}%"
    )

    print(
        f"Issues: "
        f"{consistency['issues']}"
    )