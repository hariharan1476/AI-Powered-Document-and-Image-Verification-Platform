from ultralytics import YOLO

model = YOLO("ml/models/best.pt")

results = model.predict(
    source="ml/test_images/certificate.jpg",
    conf=0.5,
    save=True
)

for result in results:
    print(result.boxes)