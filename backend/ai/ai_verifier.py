from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = Path("ml/models/best.pt")

model = YOLO(str(MODEL_PATH))


def verify_document(file_path, file_type):

    # Currently YOLO verification is for certificate images
    if file_type.lower() in [".jpg", ".jpeg", ".png"]:

        results = model.predict(
            source=file_path,
            conf=0.50,
            verbose=False
        )

        result = results[0]

        fake_count = 0
        true_count = 0

        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            class_name = model.names[class_id]

            if class_name == "fake":
                fake_count += 1

            elif class_name == "true":
                true_count += 1

        if fake_count > 0:
            authenticity_score = 30
            verification_result = "Fake"

            details = (
                f"YOLO detected {fake_count} suspicious region(s)"
            )

        elif true_count > 0:
            authenticity_score = 90
            verification_result = "Verified"

            details = (
                f"YOLO detected {true_count} genuine region(s)"
            )

        else:
            authenticity_score = 50
            verification_result = "Uncertain"

            details = "No trained certificate region detected"

        return {
            "authenticity_score": authenticity_score,
            "completeness_score": 0,
            "consistency_score": 0,
            "overall_score": authenticity_score,
            "result": verification_result,
            "details": details
        }

    return {
        "authenticity_score": 0,
        "completeness_score": 0,
        "consistency_score": 0,
        "overall_score": 0,
        "result": "Unsupported",
        "details": "This file type is not supported by the certificate model"
    }