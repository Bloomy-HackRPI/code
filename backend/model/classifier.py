from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
from sklearn.preprocessing import LabelEncoder
from datasets import Dataset
import pickle
import torch
import json
import os

class IntentClassifier:

    def __init__(self):

        self.dir = 'model/data'
        os.makedirs(self.dir, exist_ok=True)

        self.encoder = LabelEncoder()
        self.tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
        self.model = AutoModelForSequenceClassification.from_pretrained(
            "distilbert-base-uncased", num_labels=3
        )

        if all(os.path.exists(path) for path in [self.dir + '/model', self.dir + '/tokenizer', self.dir + '/encoder.pkl']):
            self.load()
        else:
            self.train()
            self.load()

    def load(self):
        self.tokenizer = AutoTokenizer.from_pretrained(self.dir + '/tokenizer')
        self.model = AutoModelForSequenceClassification.from_pretrained(self.dir + '/model')
        with open(self.dir + '/encoder.pkl', "rb") as f:
            self.encoder = pickle.load(f)
        print("Loaded model, tokenizer, and encoder from disk.")


    def save(self):
        self.model.save_pretrained(self.dir + '/model')
        self.tokenizer.save_pretrained(self.dir + '/tokenizer')
        with open(self.dir + '/encoder.pkl', "wb") as f:
            pickle.dump(self.encoder, f)
        print(f"Model, tokenizer, and encoder saved to {self.dir}.")


    def getIntent(self, message):

        # pass message into classifier
        # return the intent

        self.model.eval()
        tokens = self.tokenizer(message, return_tensors='pt')
        output = self.model(**tokens)
        mostLikelyVector = torch.argmax(output.logits).item()
        intent = self.encoder.inverse_transform([mostLikelyVector])[0]
        return intent


    def train(self):
        
        with open(self.dir + '/train.json', 'r') as f:
            data = json.load(f)

        sentences, labels = [sample['sentence'] for sample in data], [sample['intent'] for sample in data]
        labelVectors = self.encoder.fit_transform(labels)

        dataset = Dataset.from_dict({"text": sentences, "label": labelVectors})
        tokenizedDataset = dataset.map(self.tokenize, batched=True)
        tokenizedDataset.set_format("torch", columns=["input_ids", "attention_mask", "label"])

        training_args = TrainingArguments(
            output_dir="./results",
            per_device_train_batch_size=2,
            num_train_epochs=5,
            logging_steps=1,
            logging_dir="./logs",
            save_strategy="no",   # save at each epoch
            save_total_limit=1,   # keep only the last checkpoint
            use_cpu=True
        )

        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=tokenizedDataset
        )

        trainer.train()

        # save the model weights
        # save the tokenizer

        self.save()

    def tokenize(self, sample):
        return self.tokenizer(sample["text"], padding=True, truncation=True)