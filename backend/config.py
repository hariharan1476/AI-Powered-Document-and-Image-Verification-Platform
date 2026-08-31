import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

APP_NAME = os.getenv(
    "APP_NAME",
    "AI Document Image Verification Platform"
)

APP_HOST = os.getenv("APP_HOST", "127.0.0.1")

APP_PORT = int(os.getenv("APP_PORT", "8002"))