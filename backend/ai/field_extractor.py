import re


def extract_fields(text: str):
    fields = {
        "name": None,
        "organization": None,
        "document_type": None,
        "course": None,
        "start_date": None,
        "end_date": None,
        "certificate_id": None
    }

    # -------------------------------------------------
    # CLEAN TEXT
    # -------------------------------------------------

    text = text.replace("\r", "")

    lines = [
        line.strip()
        for line in text.split("\n")
        if line.strip()
    ]

    # -------------------------------------------------
    # DOCUMENT TYPE
    # -------------------------------------------------

    document_types = [
        "Certificate of Achievement",
        "Certificate of Completion",
        "Degree Certificate",
        "Certificate",
        "Diploma",
        "Marksheet",
        "Identity Card",
        "ID Card"
    ]

    for document_type in document_types:
        if re.search(
            re.escape(document_type),
            text,
            re.IGNORECASE
        ):
            fields["document_type"] = document_type
            break

    # -------------------------------------------------
    # ORGANIZATION
    # -------------------------------------------------

    organization_patterns = [
        r"\b([A-Z][A-Za-z&., ]+\bUniversity)\b",
        r"\b([A-Z][A-Za-z&., ]+\bCollege)\b",
        r"\b([A-Z][A-Za-z&., ]+\bInstitute)\b",
        r"\b([A-Z][A-Za-z&., ]+\bTechnologies)\b",
        r"\b([A-Z][A-Za-z&., ]+\bTechnology)\b",
        r"\b([A-Z][A-Za-z&., ]+\bServices)\b",
        r"\b([A-Z][A-Za-z&., ]+\bCorporation)\b",
        r"\b([A-Z][A-Za-z&., ]+\bCompany)\b"
    ]

    for pattern in organization_patterns:
        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            organization = match.group(1).strip()

            if len(organization.split()) >= 2:
                fields["organization"] = organization
                break

    # -------------------------------------------------
    # DATE DETECTION
    # -------------------------------------------------

    date_pattern = (
        r"\b\d{1,2}"
        r"(?:st|nd|rd|th)?"
        r"\s+"
        r"[A-Za-z]{3,9}"
        r"\s+"
        r"\d{4}\b"
    )

    # First try explicit Start Date
    start_match = re.search(
        r"Start\s*Date\s*[:\-]?\s*"
        + f"({date_pattern})",
        text,
        re.IGNORECASE
    )

    if start_match:
        fields["start_date"] = start_match.group(1)

    # First try explicit End Date
    end_match = re.search(
        r"End\s*Date\s*[:\-]?\s*"
        + f"({date_pattern})",
        text,
        re.IGNORECASE
    )

    if end_match:
        fields["end_date"] = end_match.group(1)

    # -------------------------------------------------
    # FALLBACK DATE DETECTION
    # -------------------------------------------------
    # Example:
    # Programming with Python 3.X
    # 01st Feb 2023
    #
    # If there are no explicit Start/End dates,
    # use the first detected date as the document date.

    if fields["start_date"] is None:
        all_dates = re.findall(date_pattern, text)

        if all_dates:
            fields["start_date"] = all_dates[0]

    if fields["end_date"] is None:
        all_dates = re.findall(date_pattern, text)

        if all_dates:
            # If only one date exists, it represents
            # the certificate/document date.
            fields["end_date"] = all_dates[0]

    # -------------------------------------------------
    # CERTIFICATE ID / CODE
    # -------------------------------------------------

    certificate_patterns = [
        r"(?:Certificate\s*Code|Certificate\s*ID|Cert\s*ID)"
        r"\s*[:\-]\s*([A-Za-z0-9\-]+)",

        r"(?:Certificate\s*Number|Certificate\s*No\.?)"
        r"\s*[:\-]\s*([A-Za-z0-9\-]+)"
    ]

    for pattern in certificate_patterns:
        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            fields["certificate_id"] = match.group(1)
            break

    # -------------------------------------------------
    # COURSE / TITLE
    # -------------------------------------------------

    course_patterns = [
        # Example:
        # successfully completing
        # Introduction to Soft Skills
        r"successfully\s+completing\s+([^\n]+)",

        # Example:
        # course: Python
        r"course\s*[:\-]\s*([^\n]+)",

        # Example:
        # program: Python
        r"program\s*[:\-]\s*([^\n]+)",

        # Example:
        # subject: Python
        r"subject\s*[:\-]\s*([^\n]+)"
    ]

    for pattern in course_patterns:
        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            course = match.group(1).strip()

            if course:
                fields["course"] = course
                break

    # -------------------------------------------------
    # FALLBACK COURSE DETECTION
    # -------------------------------------------------
    # Handles certificates like:
    #
    # HARIHARAN K
    # Programming with Python 3.X
    # 01st Feb 2023
    # Certificate code : 4135943

    if fields["course"] is None:

        for index, line in enumerate(lines):

            # Skip obvious non-course lines
            if re.search(
                r"certificate|congratulations|"
                r"date|code|id|name|candidate|student|"
                r"university|college|institute|"
                r"technologies|technology|services|"
                r"corporation|company",
                line,
                re.IGNORECASE
            ):
                continue

            # Skip lines that are only dates
            if re.fullmatch(
                date_pattern,
                line,
                re.IGNORECASE
            ):
                continue

            # Skip uppercase person names
            if re.fullmatch(
                r"[A-Z][A-Z .'-]+",
                line
            ):
                continue

            # Course/title should normally contain
            # at least one alphabetic character.
            if not re.search(r"[A-Za-z]", line):
                continue

            # Avoid very long paragraphs
            if len(line) > 120:
                continue

            # Avoid very short words
            if len(line.split()) < 2:
                continue

            # Prefer a line immediately before a date.
            if index + 1 < len(lines):

                next_line = lines[index + 1]

                if re.fullmatch(
                    date_pattern,
                    next_line,
                    re.IGNORECASE
                ):
                    fields["course"] = line
                    break

    # -------------------------------------------------
    # NAME
    # -------------------------------------------------

    # First look for common labels.

    name_patterns = [
        r"(?:Name|Candidate|Student)"
        r"\s*[:\-]\s*([A-Za-z][A-Za-z .'-]+)",

        r"congratulations\s*[!,:]?\s*\n\s*"
        r"([A-Z][A-Z .'-]+)"
    ]

    for pattern in name_patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            name = match.group(1).strip()

            if len(name.split()) >= 2:
                fields["name"] = name
                break

    # -------------------------------------------------
    # FALLBACK NAME
    # -------------------------------------------------

    if fields["name"] is None:

        for line in lines:

            if (
                2 <= len(line.split()) <= 5
                and re.fullmatch(
                    r"[A-Z][A-Z .'-]+",
                    line
                )
            ):
                fields["name"] = line
                break

    return fields


# -------------------------------------------------
# COMMAND LINE TEST
# -------------------------------------------------

if __name__ == "__main__":

    import sys

    if len(sys.argv) < 2:

        print(
            "Usage: "
            "python backend/ai/field_extractor.py <text_file>"
        )

        exit()

    text_file = sys.argv[1]

    with open(
        text_file,
        "r",
        encoding="utf-8"
    ) as file:

        text = file.read()

    result = extract_fields(text)

    print("\nExtracted Fields:")
    print("-----------------")

    for key, value in result.items():
        print(f"{key}: {value}")