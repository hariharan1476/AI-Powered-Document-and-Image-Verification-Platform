import sys

from transformers import pipeline

from document_extractor import extract_text

from entity_resolver import (
    resolve_certificate_entities,
    print_resolved
)


MODEL_PATH = "ml/models/certificate_ner"



print("Loading certificate NER model...")

ner = pipeline(
    "ner",
    model=MODEL_PATH,
    tokenizer=MODEL_PATH,
    aggregation_strategy="simple"
)



if len(sys.argv) < 2:

    print(
        "Usage:\n"
        "python ml/test_certificate_ner.py "
        "ml/test_images/certificate.jpg"
    )

    sys.exit(1)


image_path = sys.argv[1]

text = extract_text(image_path)


print("\n========== OCR TEXT ==========\n")
print(text)


entities = ner(text)


print("\n========== RAW NER ==========\n")

for entity in entities:

    print(
        f"{entity['entity_group']:18} | "
        f"{entity['word']:35} | "
        f"{entity['score']:.4f}"
    )


result = resolve_certificate_entities(
    text,
    entities
)


print_resolved(result)