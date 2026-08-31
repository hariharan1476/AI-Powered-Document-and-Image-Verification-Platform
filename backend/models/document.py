from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from backend.database.db import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    filename = Column(
        String(255),
        nullable=False
    )

    file_path = Column(
        String(500),
        nullable=False
    )

    file_type = Column(
        String(50),
        nullable=False
    )

    file_size = Column(
        Integer,
        nullable=False
    )

    file_hash = Column(
        String(128),
        nullable=False
    )

    cloudinary_public_id = Column(
        String(500),
        nullable=True
    )

    cloudinary_url = Column(
        String(1000),
        nullable=True
    )

    cloudinary_resource_type = Column(
        String(50),
        nullable=True
    )

    status = Column(
        String(50),
        default="uploaded"
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )