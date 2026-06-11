import os
import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Embedding, LSTM, Dense
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from sklearn.preprocessing import LabelEncoder
import unicodedata
import re

class NlpIntentClassifier:
    def __init__(self, model_dir='deeplearning/saved_models'):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.model_path = os.path.join(self.model_dir, 'nlp_router.keras')
        self.tokenizer_path = os.path.join(self.model_dir, 'tokenizer.pkl')
        self.label_encoder_path = os.path.join(self.model_dir, 'label_encoder.pkl')
        
        self.max_len = 50
        self.vocab_size = 5000
        
        self.model = None
        self.tokenizer = None
        self.label_encoder = None
        
        self._load_if_exists()

    def _load_if_exists(self):
        if os.path.exists(self.model_path) and os.path.exists(self.tokenizer_path) and os.path.exists(self.label_encoder_path):
            self.model = load_model(self.model_path)
            with open(self.tokenizer_path, 'rb') as f:
                self.tokenizer = pickle.load(f)
            with open(self.label_encoder_path, 'rb') as f:
                self.label_encoder = pickle.load(f)

    def is_trained(self):
        return self.model is not None

    def _preprocess_text(self, text):
        # Lowercase
        text = str(text).lower()
        # Remove accents
        text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
        # Remove special chars
        text = re.sub(r'[^a-z0-9\s]', '', text)
        return text

    def train(self, texts, labels, epochs=50):
        # Preprocess
        clean_texts = [self._preprocess_text(t) for t in texts]
        
        # Tokenizer
        self.tokenizer = Tokenizer(num_words=self.vocab_size, oov_token='<OOV>')
        self.tokenizer.fit_on_texts(clean_texts)
        sequences = self.tokenizer.texts_to_sequences(clean_texts)
        X = pad_sequences(sequences, maxlen=self.max_len, padding='pre')
        
        # Labels
        self.label_encoder = LabelEncoder()
        y = self.label_encoder.fit_transform(labels)
        num_classes = len(self.label_encoder.classes_)
        
        # Build Model
        self.model = Sequential([
            Embedding(input_dim=self.vocab_size, output_dim=128, input_length=self.max_len),
            LSTM(64),
            Dense(32, activation='relu'),
            Dense(num_classes, activation='softmax')
        ])
        
        self.model.compile(loss='sparse_categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
        
        # Train
        history = self.model.fit(X, y, epochs=epochs, verbose=1)
        
        # Save
        self.model.save(self.model_path)
        with open(self.tokenizer_path, 'wb') as f:
            pickle.dump(self.tokenizer, f)
        with open(self.label_encoder_path, 'wb') as f:
            pickle.dump(self.label_encoder, f)
            
        return history.history

    def predict(self, text):
        clean_text = self._preprocess_text(text)
        seq = self.tokenizer.texts_to_sequences([clean_text])
        padded = pad_sequences(seq, maxlen=self.max_len, padding='pre')
        
        preds = self.model.predict(padded)[0]
        
        top_indices = preds.argsort()[::-1]
        all_preds = []
        for idx in top_indices:
            all_preds.append({
                "policy_id": str(self.label_encoder.inverse_transform([idx])[0]),
                "confidence": float(preds[idx])
            })
            
        best_pred = all_preds[0]
        return {
            "policy_id": best_pred["policy_id"],
            "confidence": best_pred["confidence"],
            "all_predictions": all_preds
        }
