import sys
import os


sys.path.insert(
    0,
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)


from backend.cloudinary_config import upload_document


if __name__ == "__main__":

    if len(sys.argv) < 2:
        print(
            "Usage:"
        )
        print(
            "python backend/test_cloudinary.py "
            "ml/test_images/certificate.jpg"
        )
        sys.exit(1)

    file_path = sys.argv[1]

    print("=" * 60)
    print("          CLOUDINARY UPLOAD TEST")
    print("=" * 60)

    print()
    print(f"File: {file_path}")
    print()

    try:

        result = upload_document(file_path)

        print("UPLOAD SUCCESS")
        print()

        print("Public ID:")
        print(result["public_id"])

        print()

        print("Secure URL:")
        print(result["secure_url"])

        print()

        print("Resource Type:")
        print(result["resource_type"])

        print()

        print("Format:")
        print(result["format"])

        print()

        print("Size:")
        print(result["bytes"])

        print()
        print("=" * 60)

    except Exception as e:

        print()
        print("UPLOAD FAILED")
        print()
        print(type(e).__name__)
        print(str(e))
        sys.exit(1)