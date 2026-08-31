import json
from pathlib import Path

import torch
from torch.utils.data import Dataset

from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)

DATA_PATH = Path("ml/nlp_data/train.json")
MODEL_NAME = "dslim/bert-base-NER"
OUTPUT_DIR = "ml/models/certificate_ner"

LABELS = [
    "O",

    "B-PERSON",
    "I-PERSON",

    "B-ORGANIZATION",
    "I-ORGANIZATION",

    "B-COURSE",
    "I-COURSE",

    "B-CERTIFICATE_ID",
    "I-CERTIFICATE_ID",

    "B-DATE",
    "I-DATE"
]

label2id = {
    label: i
    for i, label in enumerate(LABELS)
}

id2label = {
    i: label
    for i, label in enumerate(LABELS)
}
print("\nLoading tokenizer...")

tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME
)

class CertificateNERDataset(Dataset):

    def __init__(self, data):

        self.data = data

    def __len__(self):

        return len(self.data)

    def __getitem__(self, index):

        example = self.data[index]

        text = example["text"]
        entities = example["entities"]

        encoding = tokenizer(
            text,
            truncation=True,
            padding=False,
            return_offsets_mapping=True
        )

        offsets = encoding["offset_mapping"]

        labels = []

        for token_start, token_end in offsets:

            if token_start == token_end:

                labels.append(-100)

                continue

            token_label = "O"

            for entity_start, entity_end, entity_type in entities:

                if (
                    token_start >= entity_start
                    and token_end <= entity_end
                ):

                    if token_start == entity_start:

                        token_label = f"B-{entity_type}"

                    else:

                        token_label = f"I-{entity_type}"

                    break

            labels.append(
                label2id[token_label]
            )

        encoding.pop("offset_mapping")

        encoding["labels"] = labels

        return {
            key: torch.tensor(value)
            for key, value in encoding.items()
        }

print("\nLoading training data...")

with open(
    DATA_PATH,
    "r",
    encoding="utf-8"
) as file:

    raw_data = json.load(file)


print(
    f"Training examples: {len(raw_data)}"
)

dataset = CertificateNERDataset(
    raw_data
)

print("\nLoading BERT NER model...")

model = AutoModelForTokenClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(LABELS),
    id2label=id2label,
    label2id=label2id,
    ignore_mismatched_sizes=True
)


model.config.num_labels = len(LABELS)
model.config.id2label = id2label
model.config.label2id = label2id

data_collator = DataCollatorForTokenClassification(
    tokenizer=tokenizer
)

training_args = TrainingArguments(

    output_dir=OUTPUT_DIR,

    num_train_epochs=10,

    per_device_train_batch_size=2,

    learning_rate=5e-5,

    weight_decay=0.01,

    logging_steps=1,

    save_strategy="epoch",

    report_to="none",

    use_cpu=True
)

trainer = Trainer(

    model=model,

    args=training_args,

    train_dataset=dataset,

    data_collator=data_collator
)

print("\n")
print("=" * 60)
print("STARTING CERTIFICATE NER TRAINING")
print("=" * 60)

trainer.train()

print("\nSaving model...")

trainer.save_model(
    OUTPUT_DIR
)

tokenizer.save_pretrained(
    OUTPUT_DIR
)


print("\n")
print("=" * 60)
print("TRAINING COMPLETE")
print("=" * 60)

print(
    f"\nModel saved to:\n{OUTPUT_DIR}"
)