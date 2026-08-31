import sys
import re


DOCUMENT_TYPES = [
    "CERTIFICATE",
    "RESUME",
    "MARKSHEET",
    "ID_DOCUMENT",
    "INVOICE",
    "OFFER_LETTER",
    "REPORT",
]


def normalize(text):
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def count_matches(text, patterns):
    score = 0

    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            score += 1

    return score


# ---------------------------------------------------------
# DOCUMENT PATTERNS
# ---------------------------------------------------------

PATTERNS = {

    "CERTIFICATE": [

        # Strong certificate indicators
        r"\bcertificate\b",
        r"\bcertified\b",
        r"\bcertificate of\b",
        r"\bcompletion\b",
        r"\bachievement\b",
        r"\bcompletion certificate\b",
        r"\bcertificate id\b",
        r"\bcert id\b",

        # Common certificate wording
        r"\bsuccessfully completed\b",
        r"\bsuccessfully completing\b",
        r"\bhas successfully completed\b",
        r"\bawarded to\b",
        r"\bawarded\b",
        r"\bthis is to certify\b",
        r"\bis hereby certified\b",
        r"\bcompleted the\b",
        r"\bparticipated in\b",
        r"\bparticipation\b",
        r"\bcourse\b",
        r"\btraining\b",
        r"\bprogram\b",
        r"\bpath\b",

        # Date indicators
        r"\bstart date\b",
        r"\bend date\b",
        r"\bissued\b",
        r"\bissue date\b",

        # Certificate-like IDs
        r"\bcert[\s_-]*id\b",
        r"\bcredential\b",
        r"\bcredential id\b",
        r"\bverification code\b",
        r"\bverification id\b",

        # Generic alphanumeric certificate IDs
        r"\b[a-z]{2,}\d{3,}[a-z0-9]*\b",
        r"\b[A-Z]{2,}\d{2,}[A-Z0-9]{2,}\b",
    ],

    "RESUME": [

        r"\bresume\b",
        r"\bcurriculum vitae\b",
        r"\bprofessional summary\b",
        r"\bwork experience\b",
        r"\beducation\b",
        r"\bskills\b",
        r"\bprojects\b",
        r"\bachievements\b",
        r"\bcertifications\b",
        r"\bexperience\b",
        r"\bobjective\b",
        r"\blinkedin\b",
        r"\bgithub\b",
        r"\bprofessional experience\b",
    ],

    "MARKSHEET": [

        r"\bmarksheet\b",
        r"\bmark sheet\b",
        r"\bmarks statement\b",
        r"\bstatement of marks\b",
        r"\bgrade sheet\b",
        r"\bgrade card\b",
        r"\bsemester\b",
        r"\bsubject\b",
        r"\bmarks\b",
        r"\btotal marks\b",
        r"\bpercentage\b",
        r"\bcgpa\b",
        r"\bgpa\b",
        r"\bresult\b",
        r"\bpass\b",
        r"\bfailed\b",
    ],

    "ID_DOCUMENT": [

        r"\bidentity card\b",
        r"\bid card\b",
        r"\bidentification\b",
        r"\bidentity\b",
        r"\bdate of birth\b",
        r"\bdob\b",
        r"\bnationality\b",
        r"\baddress\b",
        r"\bgovernment\b",
        r"\bpassport\b",
        r"\bdriving licence\b",
        r"\bdriving license\b",
        r"\baadhaar\b",
        r"\bpan card\b",
        r"\bvoter\b",
    ],

    "INVOICE": [

        r"\binvoice\b",
        r"\btax invoice\b",
        r"\bbill\b",
        r"\bbilling\b",
        r"\bsubtotal\b",
        r"\btotal amount\b",
        r"\bgrand total\b",
        r"\btax\b",
        r"\bgst\b",
        r"\bquantity\b",
        r"\bunit price\b",
        r"\bamount\b",
        r"\bpayment due\b",
        r"\bdue date\b",
    ],

    "OFFER_LETTER": [

        r"\boffer letter\b",
        r"\boffer of employment\b",
        r"\bemployment offer\b",
        r"\bjoining date\b",
        r"\bdate of joining\b",
        r"\bjob offer\b",
        r"\bposition\b",
        r"\bdesignation\b",
        r"\bsalary\b",
        r"\bcompensation\b",
        r"\bemployee\b",
        r"\bprobation\b",
    ],

    "REPORT": [

        r"\breport\b",
        r"\bexecutive summary\b",
        r"\bintroduction\b",
        r"\bmethodology\b",
        r"\bfindings\b",
        r"\bconclusion\b",
        r"\brecommendations\b",
        r"\banalysis\b",
        r"\bresults\b",
    ],
}


def certificate_heuristics(text):
    """
    Detect certificates that don't contain obvious words such as
    'certificate'.

    Example:

        HARIHARAN K
        URK22AI1048
        MongoDB Node.js Developer Path
        MDBdnfm30o3ze
        04-11-2024

    This is useful for certificates where OCR captures only the
    important content and misses the word 'certificate'.
    """

    score = 0
    reasons = []

    # Course / learning path / training title
    if re.search(
        r"\b(course|path|training|program|workshop|bootcamp|"
        r"developer|development|certification)\b",
        text,
        re.IGNORECASE
    ):
        score += 2
        reasons.append("course/training/path wording")

    # Date
    if re.search(
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b",
        text
    ):
        score += 1
        reasons.append("date")

    if re.search(
        r"\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)"
        r"[a-z]*\s+\d{4}\b",
        text,
        re.IGNORECASE
    ):
        score += 1
        reasons.append("written date")

    # Credential / certificate ID patterns
    if re.search(
        r"\b[A-Za-z]{2,}\d{3,}[A-Za-z0-9]*\b",
        text
    ):
        score += 2
        reasons.append("credential-like identifier")

    # Long alphanumeric credential
    if re.search(
        r"\b[A-Za-z0-9]{8,}\b",
        text
    ):
        score += 1
        reasons.append("alphanumeric identifier")

    # Typical certificate recipient wording
    if re.search(
        r"\b(awarded|completed|participated|certified|"
        r"achievement|completion)\b",
        text,
        re.IGNORECASE
    ):
        score += 2
        reasons.append("certificate wording")

    return score, reasons


def classify(text):

    text = normalize(text)

    scores = {
        document_type: 0
        for document_type in DOCUMENT_TYPES
    }

    # -----------------------------------------------------
    # Standard pattern scoring
    # -----------------------------------------------------

    for document_type, patterns in PATTERNS.items():

        scores[document_type] = count_matches(
            text,
            patterns
        )

    # -----------------------------------------------------
    # Generic certificate heuristics
    # -----------------------------------------------------

    certificate_score, certificate_reasons = certificate_heuristics(
        text
    )

    scores["CERTIFICATE"] += certificate_score

    # -----------------------------------------------------
    # Resume protection
    # -----------------------------------------------------

    # A resume normally contains several sections.
    resume_sections = count_matches(
        text,
        [
            r"\bprofessional summary\b",
            r"\bwork experience\b",
            r"\beducation\b",
            r"\bprojects\b",
            r"\bskills\b",
            r"\bachievements\b",
            r"\bcertifications\b",
        ]
    )

    if resume_sections >= 3:
        scores["RESUME"] += 3

    # -----------------------------------------------------
    # Marksheet protection
    # -----------------------------------------------------

    marksheet_indicators = count_matches(
        text,
        [
            r"\bcgpa\b",
            r"\bgpa\b",
            r"\bsemester\b",
            r"\bmarks\b",
            r"\bpercentage\b",
            r"\bgrade\b",
        ]
    )

    if marksheet_indicators >= 3:
        scores["MARKSHEET"] += 3

    # -----------------------------------------------------
    # Invoice protection
    # -----------------------------------------------------

    invoice_indicators = count_matches(
        text,
        [
            r"\binvoice\b",
            r"\bgst\b",
            r"\bsubtotal\b",
            r"\bgrand total\b",
            r"\bquantity\b",
            r"\bunit price\b",
        ]
    )

    if invoice_indicators >= 3:
        scores["INVOICE"] += 3

    # -----------------------------------------------------
    # Offer letter protection
    # -----------------------------------------------------

    offer_indicators = count_matches(
        text,
        [
            r"\boffer letter\b",
            r"\bjoining date\b",
            r"\bdesignation\b",
            r"\bsalary\b",
            r"\bcompensation\b",
        ]
    )

    if offer_indicators >= 2:
        scores["OFFER_LETTER"] += 3

    # -----------------------------------------------------
    # Select best type
    # -----------------------------------------------------

    sorted_scores = sorted(
        scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    best_type, best_score = sorted_scores[0]

    second_score = (
        sorted_scores[1][1]
        if len(sorted_scores) > 1
        else 0
    )

    # -----------------------------------------------------
    # Unknown document
    # -----------------------------------------------------

    if best_score == 0:

        document_type = "OTHER"
        confidence = 0.0

    else:

        document_type = best_type

        # Confidence based on evidence strength.
        #
        # We don't claim this is a trained ML probability.
        # It is an evidence-based confidence score.

        confidence = (
            best_score /
            max(
                best_score + second_score,
                1
            )
        ) * 100

        # Additional evidence increases confidence.
        if best_score >= 8:
            confidence += 5

        elif best_score >= 5:
            confidence += 3

        confidence = min(
            round(confidence, 2),
            99.0
        )

    return (
        document_type,
        confidence,
        scores,
        certificate_reasons
    )


def main():

    if len(sys.argv) != 2:

        print(
            "Usage: python ml/document_classifier.py "
            "<extracted_text_file>"
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

    except FileNotFoundError:

        print(
            f"File not found: {text_file}"
        )

        sys.exit(1)

    document_type, confidence, scores, reasons = classify(
        text
    )

    print(
        "\n========== DOCUMENT CLASSIFICATION =========="
    )

    print(
        f"Document Type : {document_type}"
    )

    print(
        f"Confidence : {confidence:.2f}%"
    )

    print(
        "\nEvidence Scores:"
    )

    for document_type, score in sorted(
        scores.items(),
        key=lambda x: x[1],
        reverse=True
    ):

        print(
            f"{document_type:15} : {score}"
        )

    if reasons:

        print(
            "\nCertificate Evidence:"
        )

        for reason in reasons:

            print(
                f"- {reason}"
            )


if __name__ == "__main__":
    main()