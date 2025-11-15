from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
import torch
from sklearn.preprocessing import LabelEncoder
from datasets import Dataset
import json
import numpy as np

# 1. Load training data
with open("train.json", "r") as f:
    train_data = json.load(f)

train_texts = [item["sentence"] for item in train_data]
train_labels = [item["intent"] for item in train_data]

# 2. Encode labels as integers
le = LabelEncoder()
y_train = le.fit_transform(train_labels)

# 3. Create Hugging Face dataset for training
train_dataset = Dataset.from_dict({"text": train_texts, "label": y_train})

# 4. Tokenizer & Model
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")

def tokenize(batch):
    return tokenizer(batch["text"], padding=True, truncation=True)

train_dataset = train_dataset.map(tokenize, batched=True)
train_dataset.set_format("torch", columns=["input_ids", "attention_mask", "label"])

model = AutoModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased", num_labels=len(le.classes_)
)

# 5. Training
training_args = TrainingArguments(
    output_dir="./results",
    per_device_train_batch_size=2,
    num_train_epochs=5,
    logging_steps=1,
    logging_dir="./logs",
    save_strategy="epoch",   # save at each epoch
    save_total_limit=1,      # keep only the last checkpoint
    no_cuda=True
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset
)

trainer.train()

# 6. Save model & tokenizer
model.save_pretrained("./results/final_model")
tokenizer.save_pretrained("./results/final_model")

# 7. Load test data
with open("test.json", "r") as f:
    test_data = json.load(f)

test_texts = [item["sentence"] for item in test_data]
test_labels = le.transform([item["intent"] for item in test_data])

# 8. Compute predictions and error rate
model.eval()
preds = []
for text in test_texts:
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model(**inputs)
    pred = torch.argmax(outputs.logits).item()
    preds.append(pred)

preds = np.array(preds)
error_rate = np.mean(preds != test_labels)
print(f"Error rate on test set: {error_rate:.2%}")

# 9. Predict function
def predict_intent(text):
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model(**inputs)
    pred = torch.argmax(outputs.logits).item()
    return le.inverse_transform([pred])[0]

# Example prediction
print(predict_intent("Show me Tesla's revenue for Q3 2025"))  # get_stat
