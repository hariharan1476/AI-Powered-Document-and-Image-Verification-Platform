from sqlalchemy import Column, Integer, String, Float, Text, DateTime

from datetime import datetime

from backend.database.db import Base


class Verification(Base):

    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(
        Integer,
        nullable=False
    )

    authenticity_score = Column(Float)

    completeness_score = Column(Float)

    consistency_score = Column(Float)

    overall_score = Column(Float)

    result = Column(Text)

    details = Column(Text)
    
    status = Column(String, nullable=False, default="completed")

    verified_at = Column(
        DateTime,
        default=datetime.utcnow
    )