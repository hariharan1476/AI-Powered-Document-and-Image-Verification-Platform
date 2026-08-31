from ultralytics import YOLO
from PIL import Image
import cv2
import numpy as np


MODEL_PATH = "ml/models/best.pt"


def analyze_certificate(image_path):

    model = YOLO(MODEL_PATH)

    results = model.predict(
        source=image_path,
        conf=0.50,
        verbose=False
    )

    result = results[0]

    fake_confidences = []

    for box in result.boxes:

        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        class_name = model.names[class_id]

        if class_name.lower() == "fake":
            fake_confidences.append(confidence)

    if fake_confidences:

        tamper_score = round(
            max(fake_confidences) * 100,
            2
        )

    else:
        tamper_score = 0.0

    return {
        "tampering_detected": len(fake_confidences) > 0,
        "tamper_score": tamper_score,
        "detections": len(fake_confidences)
    }


if __name__ == "__main__":

    image_path = "ml/test_images/certificate.jpg"

    result = analyze_certificate(image_path)

    print("\n========== AUTHENTICITY ANALYSIS ==========")

    print(
        f"Tampering detected: "
        f"{result['tampering_detected']}"
    )

    print(
        f"Tamper score: "
        f"{result['tamper_score']}%"
    )

    print(
        f"Suspicious regions: "
        f"{result['detections']}"
    )