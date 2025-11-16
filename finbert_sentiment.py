# finbert_sentiment.py
import sys
from transformers import BertTokenizer, BertForSequenceClassification
import torch
import pandas as pd

# Load FinBERT
tokenizer = BertTokenizer.from_pretrained("yiyanghkust/finbert-tone")
model = BertForSequenceClassification.from_pretrained("yiyanghkust/finbert-tone")

def predict_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    outputs = model(**inputs)
    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    labels = ["positive", "neutral", "negative"]
    max_index = probs.argmax().item()
    return labels[max_index]

if __name__ == "__main__":
    text = " ".join(sys.argv[1:])
    sentiment = predict_sentiment(text)
    print(sentiment)
