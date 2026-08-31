import re
from collections import defaultdict

def clean_text(text):
    """Clean BERT subword artifacts and extra spaces."""

    if not text:
        return ""

    text = text.replace("##", "")
    text = re.sub(r"\s+", " ", text)

    return text.strip()

def normalize_certificate_id(text):
    """
    Convert OCR/NLP variations of certificate IDs into
    a consistent representation.
    """

    if not text:
        return None
    text = re.sub(r"\s*-\s*", "-", text)
    text = re.sub(r"(?<=\d)\s+(?=\d)", "", text)

    text = re.sub(r"[^A-Za-z0-9\-\/]", "", text)

    return text.strip() or None

def extract_dates(text):
    """
    Extract common certificate date formats.
    """

    patterns = [
        r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b",
        r"\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b",
        r"\b\d{4}-\d{1,2}-\d{1,2}\b",
    ]

    dates = []

    for pattern in patterns:
        dates.extend(re.findall(pattern, text, flags=re.IGNORECASE))

    return list(dict.fromkeys(dates))

def extract_certificate_id(text):
    """
    Extract certificate IDs from OCR text.

    Handles examples such as:

    Cert ID: 66790-25861 468-1016
    Certificate ID: ABC-123-456
    Certificate Number: CERT-2024-001
    """

    patterns = [

        r"(?:cert(?:ificate)?\s*(?:id|no|number))\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\s\-\/]{4,})",

        r"(?:id|number)\s*[:\-]\s*([A-Za-z0-9][A-Za-z0-9\s\-\/]{4,})",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        if match:

            value = match.group(1)

            value = re.split(
                r"\n|Tata Consultancy|date\s*:",
                value,
                flags=re.IGNORECASE
            )[0]

            value = normalize_certificate_id(value)

            if value:
                return value

    return None
def resolve_organization(entities, text):
    """
    Resolve organization using NER + known organization names.
    """

    known_organizations = [

        "TCS iON",
        "Tata Consultancy Services",
        "Infosys",
        "NPTEL",
        "Coursera",
        "Udemy",
        "Google",
        "Microsoft",
        "IBM",
        "AWS",
        "Cisco",
    ]


    for organization in known_organizations:

        if organization.lower() in text.lower():

            return organization


    candidates = []

    for entity in entities:

        label = entity.get("entity_group", "")
        score = entity.get("score", 0)

        if label == "ORGANIZATION" and score >= 0.70:

            value = clean_text(entity.get("word", ""))

            if len(value) >= 3:

                candidates.append(
                    (value, score)
                )

    if candidates:

        candidates.sort(
            key=lambda x: x[1],
            reverse=True
        )

        return candidates[0][0]

    return None

def resolve_name(entities):

    candidates = []

    for entity in entities:

        label = entity.get("entity_group", "")
        score = entity.get("score", 0)

        if label == "PERSON" and score >= 0.75:

            value = clean_text(
                entity.get("word", "")
            )
            if 2 <= len(value.split()) <= 5:

                candidates.append(
                    (value, score)
                )

    if not candidates:
        return None

    candidates.sort(
        key=lambda x: x[1],
        reverse=True
    )

    return candidates[0][0]
def resolve_course(entities):

    candidates = []

    for entity in entities:

        label = entity.get("entity_group", "")
        score = entity.get("score", 0)

        if label == "COURSE" and score >= 0.75:

            value = clean_text(
                entity.get("word", "")
            )
            if len(value.split()) >= 2:

                candidates.append(
                    (value, score)
                )

    if not candidates:
        return None

    candidates.sort(
        key=lambda x: (
            len(x[0].split()),
            x[1]
        ),
        reverse=True
    )

    return candidates[0][0]
def resolve_date(text, entities):

    dates = extract_dates(text)

    if dates:
        return dates[0]

    for entity in entities:

        if entity.get("entity_group") == "DATE":

            value = clean_text(
                entity.get("word", "")
            )

            if value:
                return value

    return None


def resolve_certificate_entities(text, entities):

    result = {

        "name": None,
        "course": None,
        "organization": None,
        "certificate_id": None,
        "date": None,

        "ner_entities": entities
    }



    result["name"] = resolve_name(entities)


    result["course"] = resolve_course(entities)


    result["organization"] = resolve_organization(
        entities,
        text
    )

    result["certificate_id"] = extract_certificate_id(
        text
    )

    if not result["certificate_id"]:

        for entity in entities:

            if entity.get("entity_group") == "CERTIFICATE_ID":

                value = clean_text(
                    entity.get("word", "")
                )

                value = normalize_certificate_id(
                    value
                )

                if value:

                    result["certificate_id"] = value
                    break

    result["date"] = resolve_date(
        text,
        entities
    )

    return result

def print_resolved(result):

    print("\n========================================")
    print("       RESOLVED CERTIFICATE DATA")
    print("========================================")

    print(
        f"Name           : {result['name']}"
    )

    print(
        f"Course         : {result['course']}"
    )

    print(
        f"Organization    : {result['organization']}"
    )

    print(
        f"Certificate ID : {result['certificate_id']}"
    )

    print(
        f"Date           : {result['date']}"
    )

    print("========================================")