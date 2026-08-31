import sys
import os
import subprocess


PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)


def run_command(command):
    """Run a backend verification command."""

    result = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:

        print("\nCOMMAND FAILED:")
        print(" ".join(command))

        if result.stdout:
            print("\nSTDOUT:")
            print(result.stdout)

        if result.stderr:
            print("\nSTDERR:")
            print(result.stderr)

        return False

    if result.stdout:
        print(result.stdout)

    return True


def route_verification(document_type, document_path):
    """
    Route the document to the appropriate verification pipeline.
    """

    document_type = document_type.upper().strip()

    print("\n========== VERIFICATION ROUTER ==========")
    print(f"Document Type       : {document_type}")

    # --------------------------------------------------
    # CERTIFICATE
    # --------------------------------------------------

    if document_type == "CERTIFICATE":

        print(
            "Verification Module : certificate_verification"
        )

        return run_command([
            sys.executable,
            os.path.join(
                PROJECT_ROOT,
                "backend",
                "verify.py"
            ),
            document_path
        ])

    # --------------------------------------------------
    # RESUME
    # --------------------------------------------------

    elif document_type == "RESUME":

        print(
            "Verification Module : resume_verification"
        )

        return run_command([
            sys.executable,
            os.path.join(
                PROJECT_ROOT,
                "backend",
                "verify.py"
            ),
            document_path
        ])

    # --------------------------------------------------
    # MARKSHEET
    # --------------------------------------------------

    elif document_type == "MARKSHEET":

        print(
            "Verification Module : marksheet_verification"
        )

        print(
            "Status              : REVIEW REQUIRED"
        )

        return True

    # --------------------------------------------------
    # ID DOCUMENT
    # --------------------------------------------------

    elif document_type == "ID_DOCUMENT":

        print(
            "Verification Module : id_document_verification"
        )

        print(
            "Status              : REVIEW REQUIRED"
        )

        return True

    # --------------------------------------------------
    # INVOICE
    # --------------------------------------------------

    elif document_type == "INVOICE":

        print(
            "Verification Module : invoice_verification"
        )

        print(
            "Status              : REVIEW REQUIRED"
        )

        return True

    # --------------------------------------------------
    # OFFER LETTER
    # --------------------------------------------------

    elif document_type == "OFFER_LETTER":

        print(
            "Verification Module : offer_letter_verification"
        )

        print(
            "Status              : REVIEW REQUIRED"
        )

        return True

    # --------------------------------------------------
    # REPORT
    # --------------------------------------------------

    elif document_type == "REPORT":

        print(
            "Verification Module : report_verification"
        )

        print(
            "Status              : REVIEW REQUIRED"
        )

        return True

    # --------------------------------------------------
    # OTHER
    # --------------------------------------------------

    else:

        print(
            "Verification Module : generic_verification"
        )

        if not document_path:

            print(
                "Status              : REVIEW REQUIRED"
            )

            return True

        if not os.path.exists(document_path):

            print(
                f"ERROR: File not found: {document_path}"
            )

            return False

        print(
            "Status              : REVIEW REQUIRED"
        )

        return True


if __name__ == "__main__":

    if len(sys.argv) != 3:

        print("\nUsage:")
        print(
            "python backend/verification_router.py "
            "<DOCUMENT_TYPE> <FILE>"
        )

        print("\nExamples:")

        print(
            "python backend/verification_router.py "
            "CERTIFICATE ml/test_images/certificate.jpg"
        )

        print(
            "python backend/verification_router.py "
            "CERTIFICATE ml/test_images/certificate6.pdf"
        )

        print(
            "python backend/verification_router.py "
            "RESUME ml/test_images/Hariharan-K-Resume.pdf"
        )

        sys.exit(1)

    document_type = sys.argv[1]
    document_path = sys.argv[2]

    if not os.path.exists(document_path):

        print(
            f"\nERROR: File not found: {document_path}"
        )

        sys.exit(1)

    success = route_verification(
        document_type,
        document_path
    )

    sys.exit(0 if success else 1)