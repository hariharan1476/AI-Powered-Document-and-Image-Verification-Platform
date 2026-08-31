def generate_report(verification):

    return {
        "verification_id": verification.id,
        "status": verification.status,
        "document_type": verification.document_type,
        "confidence_score": verification.confidence_score,
        "message": verification.verification_message
    }