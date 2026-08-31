import re


def calculate_generic_verification(text):
    """
    Generic verification for documents that are not yet
    supported by a specialized verifier.
    """

    if not text or not text.strip():
        return {
            "text_present": False,
            "text_length": 0,
            "completeness": 0.0,
            "consistency": 0.0,
            "status": "SUSPICIOUS"
        }

    text = text.strip()

    # Basic document checks
    text_length = len(text)

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    # Detect common useful document information
    dates = re.findall(
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b"
        r"|\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b",
        text
    )

    identifiers = re.findall(
        r"\b[A-Za-z0-9][A-Za-z0-9\-_]{5,}\b",
        text
    )

    email = re.findall(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        text
    )

    # Basic completeness score
    checks = [
        text_length > 20,
        len(lines) >= 2,
        len(dates) > 0,
        len(identifiers) > 0
    ]

    completeness = round(
        (sum(checks) / len(checks)) * 100,
        2
    )

    # Generic consistency:
    # text exists and contains meaningful content
    if text_length >= 50:
        consistency = 100.0
    elif text_length >= 20:
        consistency = 75.0
    else:
        consistency = 25.0

    if completeness >= 75 and consistency >= 75:
        status = "REVIEW REQUIRED"
    else:
        status = "SUSPICIOUS"

    return {
        "text_present": True,
        "text_length": text_length,
        "lines_detected": len(lines),
        "dates_detected": len(dates),
        "identifiers_detected": len(identifiers),
        "emails_detected": len(email),
        "completeness": completeness,
        "consistency": consistency,
        "status": status
    }


if __name__ == "__main__":

    import sys

    if len(sys.argv) != 2:
        print(
            "Usage: python backend/generic_verification.py <text_file>"
        )
        sys.exit(1)

    text_file = sys.argv[1]

    with open(
        text_file,
        "r",
        encoding="utf-8"
    ) as file:
        text = file.read()

    result = calculate_generic_verification(text)

    print("\n========== GENERIC VERIFICATION ==========")

    for key, value in result.items():
        print(f"{key:25}: {value}")