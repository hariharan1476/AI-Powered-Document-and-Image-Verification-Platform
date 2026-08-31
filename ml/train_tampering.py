from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
    data="ml/datasets/Certificate-forgery-data/data.yaml",
    epochs=50,
    imgsz=640,
    batch=8,
    project="ml/runs",
    name="certificate_tampering"
)