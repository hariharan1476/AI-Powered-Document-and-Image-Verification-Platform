import os
import json
import subprocess
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.models.document import Document
from backend.models.verification import Verification

from ml.layoutlm_analyzer import analyze_with_layoutlm

from backend.verify import (
    extract_text,
    classify_document,
    extract_certificate_fields,
    verify_certificate,
)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def safe_float(
    value: Any,
    default: float = 0.0
) -> float:
    """
    Safely convert any value to float.
    """

    try:
        if value is None:
            return default

        return float(value)

    except (TypeError, ValueError):
        return default


def safe_dict(
    value: Any
) -> Dict:
    """
    Return a dictionary or empty dictionary.
    """

    if isinstance(value, dict):
        return value

    return {}


def safe_list(
    value: Any
) -> list:
    """
    Return a list or empty list.
    """

    if isinstance(value, list):
        return value

    return []


def round_score(
    value: Any
) -> float:
    """
    Normalize score to two decimal places.
    """

    value = safe_float(value)

    return round(
        max(
            0.0,
            min(
                100.0,
                value
            )
        ),
        2
    )


def normalize_status(
    value: Any,
    default: str = "REVIEW REQUIRED"
) -> str:
    """
    Normalize status value.
    """

    if value is None:
        return default

    value = str(value).strip()

    if not value:
        return default

    return value


# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)


# ============================================================
# CLASSIFICATION
# ============================================================

def get_document_classification(
    text: str
):
    """
    Safely classify uploaded document.

    Returns:

        document_type
        confidence
    """

    document_type = "UNKNOWN"
    confidence = 0.0

    try:

        classification = classify_document(
            text
        )

    except Exception:
        return (
            document_type,
            confidence
        )

    # --------------------------------------------------------
    # Tuple result
    # --------------------------------------------------------

    if isinstance(
        classification,
        tuple
    ):

        if len(classification) >= 1:

            document_type = (
                classification[0]
            )

        if len(classification) >= 2:

            confidence = safe_float(
                classification[1]
            )

    # --------------------------------------------------------
    # Dictionary result
    # --------------------------------------------------------

    elif isinstance(
        classification,
        dict
    ):

        document_type = classification.get(
            "document_type",
            classification.get(
                "type",
                "UNKNOWN"
            )
        )

        confidence = safe_float(
            classification.get(
                "confidence",
                classification.get(
                    "classification_confidence",
                    0.0
                )
            )
        )

    # --------------------------------------------------------
    # String result
    # --------------------------------------------------------

    else:

        document_type = classification

    document_type = str(
        document_type
    ).strip().upper()

    return (
        document_type,
        confidence
    )


# ============================================================
# LAYOUTLM
# ============================================================

def run_layoutlm(
    file_path: str
):
    """
    Run LayoutLMv3 analysis.

    LayoutLM failure must not stop
    the complete verification pipeline.
    """

    try:

        result = analyze_with_layoutlm(
            file_path
        )

        if isinstance(
            result,
            dict
        ):
            return result

        return {
            "status": "analyzed",
            "result": result
        }

    except Exception as error:

        return {
            "status": "failed",
            "error": str(error)
        }


# ============================================================
# ML VERIFICATION ENGINE
# ============================================================

def run_ml_verification_engine(
    file_path: str
) -> Dict:
    """
    Run the ML verification engine used by:

        python -m ml.verification_engine <file>

    The CLI prints human-readable output followed by:

        Full Result
        -----------
        { JSON }

    This function extracts that JSON and returns it to
    verification_service.py.
    """

    if not file_path:
        return {
            "success": False,
            "error": "File path is empty"
        }

    if not os.path.exists(file_path):
        return {
            "success": False,
            "error": f"File not found: {file_path}"
        }

    command = [
        "python",
        "-m",
        "ml.verification_engine",
        file_path
    ]

    try:

        process = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=180
        )

    except subprocess.TimeoutExpired:

        return {
            "success": False,
            "error": "ML verification engine timed out"
        }

    except Exception as error:

        return {
            "success": False,
            "error": str(error)
        }

    stdout = process.stdout or ""
    stderr = process.stderr or ""

    # --------------------------------------------------------
    # Process failure
    # --------------------------------------------------------

    if process.returncode != 0:

        return {
            "success": False,
            "error": (
                stderr.strip()
                or stdout.strip()
                or "ML verification engine failed"
            )
        }

    # --------------------------------------------------------
    # Locate JSON result
    # --------------------------------------------------------

    json_text = ""

    marker = "Full Result"

    if marker in stdout:

        after_marker = stdout.split(
            marker,
            1
        )[1]

        json_start = after_marker.find(
            "{"
        )

        if json_start != -1:

            json_text = after_marker[
                json_start:
            ].strip()

    # --------------------------------------------------------
    # Fallback:
    # Find first JSON object in stdout.
    # --------------------------------------------------------

    if not json_text:

        json_start = stdout.find("{")

        if json_start != -1:

            json_text = stdout[
                json_start:
            ].strip()

    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    if not json_text:

        return {
            "success": False,
            "error": (
                "ML verification engine did not "
                "return a JSON result"
            ),
            "stdout": stdout,
            "stderr": stderr
        }

    try:

        result = json.loads(
            json_text
        )

    except json.JSONDecodeError as error:

        # ----------------------------------------------------
        # Try to recover a complete JSON object.
        # This protects against extra output after JSON.
        # ----------------------------------------------------

        decoder = json.JSONDecoder()

        try:

            result, _ = decoder.raw_decode(
                json_text
            )

        except Exception:

            return {
                "success": False,
                "error": (
                    "Unable to parse ML verification "
                    f"JSON: {error}"
                ),
                "stdout": stdout,
                "stderr": stderr
            }

    # --------------------------------------------------------
    # Ensure dictionary
    # --------------------------------------------------------

    if not isinstance(
        result,
        dict
    ):

        return {
            "success": False,
            "error": (
                "ML verification engine returned "
                "invalid result type"
            )
        }

    # --------------------------------------------------------
    # Normalize the result
    # --------------------------------------------------------

    verification = safe_dict(
        result.get(
            "verification"
        )
    )

    # Make sure expected verification keys exist.
    # We DO NOT change the scores produced by the ML engine.

    normalized_verification = {

        "completeness":
            round_score(
                verification.get(
                    "completeness"
                )
            ),

        "consistency":
            round_score(
                verification.get(
                    "consistency"
                )
            ),

        "authenticity":
            round_score(
                verification.get(
                    "authenticity"
                )
            ),

        "tamper_score":
            round_score(
                verification.get(
                    "tamper_score"
                )
            ),

        "overall_score":
            round_score(
                verification.get(
                    "overall_score"
                )
            ),

        "status":
            normalize_status(
                verification.get(
                    "status"
                ),
                "REVIEW REQUIRED"
            ),

        "details":
            safe_list(
                verification.get(
                    "details"
                )
            ),

        "completeness_analysis":
            safe_dict(
                verification.get(
                    "completeness_analysis",
                    {}
                )
            ),

        "consistency_analysis":
            safe_dict(
                verification.get(
                    "consistency_analysis",
                    {}
                )
            ),

        "authenticity_analysis":
            safe_dict(
                verification.get(
                    "authenticity_analysis",
                    {}
                )
            ),

        "tamper_analysis":
            safe_dict(
                verification.get(
                    "tamper_analysis",
                    {}
                )
            )
    }
    result["verification"] = (
        normalized_verification
    )

    # --------------------------------------------------------
    # Normalize document type
    # --------------------------------------------------------

    if "document_type" not in result:

        result["document_type"] = "UNKNOWN"

    # --------------------------------------------------------
    # Normalize fields
    # --------------------------------------------------------

    if not isinstance(
        result.get("fields"),
        dict
    ):

        result["fields"] = {}

    # --------------------------------------------------------
    # Normalize sections
    # --------------------------------------------------------

    if not isinstance(
        result.get("sections_detected"),
        dict
    ):

        result["sections_detected"] = {}

    # --------------------------------------------------------
    # Return successful engine result
    # --------------------------------------------------------

    return {
        "success": True,
        "result": result,
        "stdout": stdout,
        "stderr": stderr
    }


# ============================================================
# RESUME RESULT NORMALIZATION
# ============================================================

def normalize_resume_result(
    engine_result: Dict,
    layoutlm_result: Optional[Dict] = None,
    classification_confidence: float = 0.0
) -> Dict:
    """
    Normalize result returned by ml.verification_engine.

    Keeps all resume information:

        fields
        sections_detected
        verification
        completeness_analysis
        consistency_analysis
        authenticity_analysis
        tamper_analysis
    """

    engine_result = safe_dict(
        engine_result
    )

    # --------------------------------------------------------
    # Fields
    # --------------------------------------------------------

    fields = safe_dict(
        engine_result.get(
            "fields",
            {}
        )
    )

    # --------------------------------------------------------
    # Sections
    # --------------------------------------------------------

    sections_detected = safe_dict(
        engine_result.get(
            "sections_detected",
            {}
        )
    )

    # --------------------------------------------------------
    # Verification
    # --------------------------------------------------------

    verification_data = safe_dict(
        engine_result.get(
            "verification",
            {}
        )
    )

    completeness = round_score(
        verification_data.get(
            "completeness",
            0.0
        )
    )

    consistency = round_score(
        verification_data.get(
            "consistency",
            0.0
        )
    )

    authenticity = round_score(
        verification_data.get(
            "authenticity",
            0.0
        )
    )

    tamper_score = round_score(
        verification_data.get(
            "tamper_score",
            0.0
        )
    )

    overall_score = round_score(
        verification_data.get(
            "overall_score",
            0.0
        )
    )

    status = normalize_status(
        verification_data.get(
            "status"
        ),
        "REVIEW REQUIRED"
    )

    # --------------------------------------------------------
    # Detailed analysis
    # --------------------------------------------------------

    details = safe_list(
        verification_data.get(
            "details",
            []
        )
    )

    completeness_analysis = safe_dict(
        verification_data.get(
            "completeness_analysis",
            {}
        )
    )

    consistency_analysis = safe_dict(
        verification_data.get(
            "consistency_analysis",
            {}
        )
    )

    authenticity_analysis = safe_dict(
        verification_data.get(
            "authenticity_analysis",
            {}
        )
    )

    tamper_analysis = safe_dict(
        verification_data.get(
            "tamper_analysis",
            {}
        )
    )

    # --------------------------------------------------------
    # Build normalized result
    # --------------------------------------------------------

    normalized = {

        "document_type":
            "RESUME",

        "classification_confidence":
            safe_float(
                engine_result.get(
                    "classification_confidence",
                    classification_confidence
                )
            ),

        "fields":
            fields,

        "layoutlm":
            layoutlm_result
            if layoutlm_result is not None
            else engine_result.get(
                "layoutlm"
            ),

        "sections_detected":
            sections_detected,

        "verification": {

            "completeness":
                completeness,

            "consistency":
                consistency,

            "authenticity":
                authenticity,

            "tamper_score":
                tamper_score,

            "overall_score":
                overall_score,

            "status":
                status,

            "details":
                details,

            "completeness_analysis":
                completeness_analysis,

            "consistency_analysis":
                consistency_analysis,

            "authenticity_analysis":
                authenticity_analysis,

            "tamper_analysis":
                tamper_analysis
        }
    }

    return normalized


# ============================================================
# CERTIFICATE RESULT NORMALIZATION
# ============================================================

def normalize_certificate_result(
    verification_result: Dict,
    fields: Dict,
    layoutlm_result: Optional[Dict],
    classification_confidence: float
) -> Dict:
    """
    Normalize certificate verification result.
    """

    verification_result = safe_dict(
        verification_result
    )

    completeness = round_score(
        verification_result.get(
            "completeness",
            0.0
        )
    )

    consistency = round_score(
        verification_result.get(
            "consistency",
            0.0
        )
    )

    authenticity = round_score(
        verification_result.get(
            "authenticity",
            0.0
        )
    )

    tamper_score = round_score(
        verification_result.get(
            "tamper_score",
            0.0
        )
    )

    overall_score = round_score(
        verification_result.get(
            "overall_score",
            0.0
        )
    )

    status = normalize_status(
        verification_result.get(
            "status"
        ),
        "REVIEW REQUIRED"
    )

    result = {

        "document_type":
            "CERTIFICATE",

        "classification_confidence":
            classification_confidence,

        "fields":
            fields,

        "layoutlm":
            layoutlm_result,

        "verification": {

            "completeness":
                completeness,

            "consistency":
                consistency,

            "authenticity":
                authenticity,

            "tamper_score":
                tamper_score,

            "overall_score":
                overall_score,

            "status":
                status
        }
    }

    return result


# ============================================================
# UNKNOWN DOCUMENT
# ============================================================

def build_unknown_result(
    document_type: str,
    classification_confidence: float,
    layoutlm_result: Optional[Dict]
) -> Dict:
    """
    Build result for unknown document type.
    """

    return {

        "document_type":
            document_type,

        "classification_confidence":
            classification_confidence,

        "fields":
            {},

        "layoutlm":
            layoutlm_result,

        "verification": {

            "completeness":
                0.0,

            "consistency":
                0.0,

            "authenticity":
                0.0,

            "tamper_score":
                0.0,

            "overall_score":
                0.0,

            "status":
                "DOCUMENT DETECTED",

            "details": [
                "Document type could not be fully verified"
            ]
        }
    }


# ============================================================
# MAIN VERIFICATION SERVICE
# ============================================================

def verify_uploaded_document(
    db: Session,
    document: Document
):
    """
    Complete document verification pipeline.

    Pipeline:

        Uploaded File
             ↓
        File Validation
             ↓
        OCR / Text Extraction
             ↓
        LayoutLMv3
             ↓
        Document Classification
             ↓
        Verification Engine
             ↓
        Result Normalization
             ↓
        PostgreSQL
    """

    # ========================================================
    # 1. FILE VALIDATION
    # ========================================================

    file_path = document.file_path

    if not file_path:

        raise ValueError(
            "Document file path is empty"
        )

    if not os.path.exists(
        file_path
    ):

        raise FileNotFoundError(
            f"Document file not found: {file_path}"
        )

    if not os.path.isfile(
        file_path
    ):

        raise ValueError(
            f"Document path is not a file: {file_path}"
        )

    # ========================================================
    # 2. OCR / TEXT EXTRACTION
    # ========================================================

    text = extract_text(
        file_path
    )

    if not text or not text.strip():

        raise ValueError(
            "Could not extract text from the document"
        )

    # ========================================================
    # 3. LAYOUTLMv3
    # ========================================================

    layoutlm_result = run_layoutlm(
        file_path
    )

    # ========================================================
    # 4. CLASSIFICATION
    # ========================================================

    (
        document_type,
        classification_confidence
    ) = get_document_classification(
        text
    )

    # ========================================================
    # 5. DEFAULT VALUES
    # ========================================================

    completeness = 0.0
    consistency = 0.0
    authenticity = 0.0
    tamper_score = 0.0
    overall_score = 0.0

    status = "REVIEW REQUIRED"

    result = {}

    # ========================================================
    # 6. CERTIFICATE
    # ========================================================

    if document_type == "CERTIFICATE":

        fields = extract_certificate_fields(
            text
        )

        if not isinstance(
            fields,
            dict
        ):

            fields = {}

        verification_result = verify_certificate(
            file_path,
            fields,
            classification_confidence,
            text
        )

        result = normalize_certificate_result(
            verification_result,
            fields,
            layoutlm_result,
            classification_confidence
        )

        verification_data = safe_dict(
            result.get(
                "verification",
                {}
            )
        )

        completeness = round_score(
            verification_data.get(
                "completeness"
            )
        )

        consistency = round_score(
            verification_data.get(
                "consistency"
            )
        )

        authenticity = round_score(
            verification_data.get(
                "authenticity"
            )
        )

        tamper_score = round_score(
            verification_data.get(
                "tamper_score"
            )
        )

        overall_score = round_score(
            verification_data.get(
                "overall_score"
            )
        )

        status = normalize_status(
            verification_data.get(
                "status"
            ),
            "REVIEW REQUIRED"
        )

    # ========================================================
    # 7. RESUME
    # ========================================================

    elif document_type == "RESUME":

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # DO NOT call the old verify_resume(text) here.
        #
        # The old function only returns basic resume
        # section detection and therefore produces:
        #
        # completeness = 71.43
        # authenticity = 0
        # consistency = 0
        #
        # Instead, call the same ML verification engine that
        # already produces your correct CLI result:
        #
        # authenticity = 100
        # completeness = 91.67
        # consistency = 100
        # overall = 97.92
        # status = VERIFIED
        # ----------------------------------------------------

        engine_response = run_ml_verification_engine(
            file_path
        )

        # ----------------------------------------------------
        # Engine failed
        # ----------------------------------------------------

        if not engine_response.get(
            "success",
            False
        ):

            engine_error = engine_response.get(
                "error",
                "Unknown verification engine error"
            )

            # Return a controlled review result instead
            # of crashing the API.

            result = {

                "document_type":
                    "RESUME",

                "classification_confidence":
                    classification_confidence,

                "fields":
                    {},

                "layoutlm":
                    layoutlm_result,

                "sections_detected":
                    {},

                "verification": {

                    "completeness":
                        0.0,

                    "consistency":
                        0.0,

                    "authenticity":
                        0.0,

                    "tamper_score":
                        0.0,

                    "overall_score":
                        0.0,

                    "status":
                        "REVIEW REQUIRED",

                    "details": [
                        "Resume verification engine failed",
                        engine_error
                    ]
                }
            }

            completeness = 0.0
            consistency = 0.0
            authenticity = 0.0
            tamper_score = 0.0
            overall_score = 0.0
            status = "REVIEW REQUIRED"

        # ----------------------------------------------------
        # Engine succeeded
        # ----------------------------------------------------

        else:

            engine_result = safe_dict(
                engine_response.get(
                    "result",
                    {}
                )
            )

            result = normalize_resume_result(
                engine_result,
                layoutlm_result,
                classification_confidence
            )

            verification_data = safe_dict(
                result.get(
                    "verification",
                    {}
                )
            )

            completeness = round_score(
                verification_data.get(
                    "completeness"
                )
            )

            consistency = round_score(
                verification_data.get(
                    "consistency"
                )
            )

            authenticity = round_score(
                verification_data.get(
                    "authenticity"
                )
            )

            tamper_score = round_score(
                verification_data.get(
                    "tamper_score"
                )
            )

            overall_score = round_score(
                verification_data.get(
                    "overall_score"
                )
            )

            status = normalize_status(
                verification_data.get(
                    "status"
                ),
                "REVIEW REQUIRED"
            )

    # ========================================================
    # 8. UNKNOWN
    # ========================================================

    else:

        result = build_unknown_result(
            document_type,
            classification_confidence,
            layoutlm_result
        )

        status = "DOCUMENT DETECTED"

    # ========================================================
    # 9. FINAL SCORE NORMALIZATION
    # ========================================================

    completeness = round_score(
        completeness
    )

    consistency = round_score(
        consistency
    )

    authenticity = round_score(
        authenticity
    )

    tamper_score = round_score(
        tamper_score
    )

    overall_score = round_score(
        overall_score
    )

    # ========================================================
    # 10. FORCE FINAL VALUES INTO RESULT
    # ========================================================

    verification_data = safe_dict(
        result.get(
            "verification",
            {}
        )
    )

    verification_data[
        "completeness"
    ] = completeness

    verification_data[
        "consistency"
    ] = consistency

    verification_data[
        "authenticity"
    ] = authenticity

    verification_data[
        "tamper_score"
    ] = tamper_score

    verification_data[
        "overall_score"
    ] = overall_score

    verification_data[
        "status"
    ] = status

    result[
        "verification"
    ] = verification_data

    # ========================================================
    # 11. SAVE TO POSTGRESQL
    # ========================================================

    verification = Verification(

        document_id=
            document.id,

        result=
            json.dumps(
                result,
                default=str
            ),

        authenticity_score=
            authenticity,

        completeness_score=
            completeness,

        consistency_score=
            consistency,

        overall_score=
            overall_score,

        details=
            json.dumps(
                result,
                default=str
            ),

        status=
            "completed"
    )

    db.add(
        verification
    )

    # ========================================================
    # 12. UPDATE DOCUMENT STATUS
    # ========================================================

    document.status = str(
        status
    ).lower()

    # ========================================================
    # 13. COMMIT
    # ========================================================

    db.commit()

    db.refresh(
        verification
    )

    return verification