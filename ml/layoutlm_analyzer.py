import sys
import json
import os

import torch
from PIL import Image

from transformers import (
    LayoutLMv3Processor,
    LayoutLMv3Model,
)


MODEL_NAME = "microsoft/layoutlmv3-base"

_processor = None
_model = None


def load_model():
    global _processor, _model

    if _processor is None or _model is None:

        print(
            "Loading LayoutLMv3...",
            file=sys.stderr
        )

        _processor = LayoutLMv3Processor.from_pretrained(
            MODEL_NAME,
            apply_ocr=True
        )

        _model = LayoutLMv3Model.from_pretrained(
            MODEL_NAME
        )

        _model.eval()

        print(
            "LayoutLMv3 loaded successfully",
            file=sys.stderr
        )

    return _processor, _model


def load_document_image(file_path):
    """
    Convert PDF/image into a PIL RGB image.

    For PDF files, the first page is analyzed.
    """

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"File not found: {file_path}"
        )

    if file_path.lower().endswith(".pdf"):

        import fitz

        pdf = fitz.open(file_path)

        if len(pdf) == 0:
            pdf.close()
            raise ValueError(
                "PDF contains no pages"
            )

        page = pdf[0]

        pix = page.get_pixmap(
            matrix=fitz.Matrix(2, 2)
        )

        image = Image.frombytes(
            "RGB",
            [pix.width, pix.height],
            pix.samples
        )

        page_count = len(pdf)

        pdf.close()

        return image, page_count

    image = Image.open(
        file_path
    ).convert("RGB")

    return image, 1


def limit_encoding_length(encoding, max_length=512):
    """
    Keep LayoutLMv3 input tensors within the
    supported maximum sequence length.

    input_ids, bbox and attention_mask must
    always be truncated together.
    """

    if "input_ids" not in encoding:
        return encoding

    current_length = encoding["input_ids"].shape[1]

    if current_length <= max_length:
        return encoding

    print(
        f"Truncating LayoutLMv3 sequence "
        f"from {current_length} to {max_length}",
        file=sys.stderr
    )

    for key in [
        "input_ids",
        "bbox",
        "attention_mask",
        "token_type_ids"
    ]:

        if key in encoding:

            tensor = encoding[key]

            if tensor.ndim >= 2:
                encoding[key] = tensor[:, :max_length]

    return encoding


def analyze_with_layoutlm(file_path):
    """
    Analyze a document using Microsoft's pretrained
    LayoutLMv3 model.

    LayoutLMv3 uses document image + OCR/layout
    information to create document representations.
    """

    processor, model = load_model()

    image, page_count = load_document_image(
        file_path
    )

    # ---------------------------------------------
    # OCR + Layout processing
    # ---------------------------------------------

    encoding = processor(
        image,
        return_tensors="pt"
    )

    # ---------------------------------------------
    # Prevent sequence length errors
    # ---------------------------------------------

    encoding = limit_encoding_length(
        encoding,
        max_length=512
    )

    # ---------------------------------------------
    # Model inference
    # ---------------------------------------------

    with torch.no_grad():

        outputs = model(
            **encoding
        )

    last_hidden_state = (
        outputs.last_hidden_state
    )

    embedding = last_hidden_state.mean(
        dim=1
    )

    sequence_length = int(
        last_hidden_state.shape[1]
    )

    hidden_size = int(
        last_hidden_state.shape[2]
    )

    input_ids = encoding.get(
        "input_ids"
    )

    bbox = encoding.get(
        "bbox"
    )

    attention_mask = encoding.get(
        "attention_mask"
    )

    # ---------------------------------------------
    # Token count
    # ---------------------------------------------

    token_count = 0

    if attention_mask is not None:

        token_count = int(
            attention_mask.sum().item()
        )

    # ---------------------------------------------
    # Bounding box count
    # ---------------------------------------------

    bbox_count = 0

    if bbox is not None:

        bbox_count = int(
            bbox.shape[1]
        )

    # ---------------------------------------------
    # Final result
    # ---------------------------------------------

    return {

        "model":
            MODEL_NAME,

        "model_type":
            "LayoutLMv3",

        "page_count":
            page_count,

        "sequence_length":
            sequence_length,

        "token_count":
            token_count,

        "layout_boxes":
            bbox_count,

        "hidden_size":
            hidden_size,

        "embedding_shape":
            list(
                embedding.shape
            ),

        "layout_analysis": {

            "ocr_enabled":
                True,

            "document_image_processed":
                True,

            "bounding_boxes_processed":
                bbox is not None,

            "tokens_processed":
                token_count
        },

        "status":
            "analyzed"
    }


def main():

    if len(sys.argv) != 2:

        print(
            "Usage: "
            "python ml/layoutlm_analyzer.py <file>"
        )

        sys.exit(1)

    file_path = sys.argv[1]

    try:

        result = analyze_with_layoutlm(
            file_path
        )

        print(
            json.dumps(
                result,
                indent=4
            )
        )

    except Exception as error:

        print(
            json.dumps(
                {
                    "status": "failed",
                    "error": str(error)
                },
                indent=4
            )
        )

        sys.exit(1)


if __name__ == "__main__":

    main()