from document_extractor import extract_text
from verification import extract_fields, check_completeness, check_consistency
from authenticity import analyze_certificate


def verify_certificate(file_path):

    text = extract_text(file_path)

    fields = extract_fields(text)

    completeness = check_completeness(fields)

    consistency = check_consistency(fields)

    authenticity = analyze_certificate(file_path)

    overall_score = (
        (completeness * 0.30)
        + (consistency["score"] * 0.30)
        + ((100 - authenticity["tamper_score"]) * 0.40)
    )

    overall_score = round(overall_score, 2)

    if authenticity["tampering_detected"]:
        status = "SUSPICIOUS"

    elif overall_score >= 80:
        status = "VERIFICATION PASSED"

    elif overall_score >= 60:
        status = "NEEDS REVIEW"

    else:
        status = "SUSPICIOUS"

    return {
        "fields": fields,
        "completeness": completeness,
        "consistency": consistency,
        "authenticity": authenticity,
        "overall_score": overall_score,
        "status": status
    }


if __name__ == "__main__":

    file_path = "ml/test_images/certificate.jpg"

    result = verify_certificate(file_path)

    print("\n========== FINAL VERIFICATION ==========")

    print("\nFIELDS:")

    for key, value in result["fields"].items():
        print(f"{key}: {value}")

    print(
        f"\nCompleteness: "
        f"{result['completeness']}%"
    )

    print(
        f"Consistency: "
        f"{result['consistency']['score']}%"
    )

    print(
        f"Tamper score: "
        f"{result['authenticity']['tamper_score']}%"
    )

    print(
        f"Overall score: "
        f"{result['overall_score']}%"
    )

    print(
        f"Final status: "
        f"{result['status']}"
    )