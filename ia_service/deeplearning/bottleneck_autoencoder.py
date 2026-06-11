import os
import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.layers import Input, Dense
from sklearn.preprocessing import LabelEncoder, StandardScaler

class BottleneckDetector:
    def __init__(self, model_dir='deeplearning/saved_models'):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.model_path = os.path.join(self.model_dir, 'bottleneck_autoencoder.keras')
        self.dept_encoder_path = os.path.join(self.model_dir, 'dept_encoder.pkl')
        self.task_encoder_path = os.path.join(self.model_dir, 'task_encoder.pkl')
        self.scaler_path = os.path.join(self.model_dir, 'bottleneck_scaler.pkl')
        self.threshold_path = os.path.join(self.model_dir, 'bottleneck_threshold.pkl')
        
        self.model = None
        self.dept_encoder = None
        self.task_encoder = None
        self.scaler = None
        self.threshold = None
        
        self._load_if_exists()

    def _load_if_exists(self):
        paths = [self.model_path, self.dept_encoder_path, self.task_encoder_path, self.scaler_path, self.threshold_path]
        if all(os.path.exists(p) for p in paths):
            self.model = load_model(self.model_path)
            with open(self.dept_encoder_path, 'rb') as f:
                self.dept_encoder = pickle.load(f)
            with open(self.task_encoder_path, 'rb') as f:
                self.task_encoder = pickle.load(f)
            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
            with open(self.threshold_path, 'rb') as f:
                self.threshold = pickle.load(f)

    def is_trained(self):
        return self.model is not None

    def _prepare_data(self, data, is_training=False):
        dept_ids = [str(d['department_id']) for d in data]
        task_ids = [str(d['task_id']) for d in data]
        days = [float(d['day_of_week']) for d in data]
        hours = [float(d['hour_of_day']) for d in data]
        durations = [float(d['duration_hours']) for d in data]

        if is_training:
            self.dept_encoder = LabelEncoder()
            self.task_encoder = LabelEncoder()
            dept_encoded = self.dept_encoder.fit_transform(dept_ids)
            task_encoded = self.task_encoder.fit_transform(task_ids)
        else:
            # Handle unknown labels in prediction
            dept_encoded = []
            for d in dept_ids:
                if d in self.dept_encoder.classes_:
                    dept_encoded.append(self.dept_encoder.transform([d])[0])
                else:
                    dept_encoded.append(0) # fallback
            
            task_encoded = []
            for t in task_ids:
                if t in self.task_encoder.classes_:
                    task_encoded.append(self.task_encoder.transform([t])[0])
                else:
                    task_encoded.append(0) # fallback
                    
        dept_encoded = np.array(dept_encoded)
        task_encoded = np.array(task_encoded)

        features = np.column_stack((dept_encoded, task_encoded, days, hours, durations))
        
        if is_training:
            self.scaler = StandardScaler()
            scaled_features = self.scaler.fit_transform(features)
        else:
            scaled_features = self.scaler.transform(features)
            
        return scaled_features

    def train(self, normal_data, epochs=100):
        X = self._prepare_data(normal_data, is_training=True)
        input_dim = X.shape[1]
        
        # Build Autoencoder
        input_layer = Input(shape=(input_dim,))
        encoded = Dense(32, activation='relu')(input_layer)
        encoded = Dense(16, activation='relu')(encoded)
        encoded = Dense(8, activation='relu')(encoded)
        
        decoded = Dense(16, activation='relu')(encoded)
        decoded = Dense(32, activation='relu')(decoded)
        decoded = Dense(input_dim, activation='linear')(decoded) # Linear because data is StandardScaled
        
        self.model = Model(inputs=input_layer, outputs=decoded)
        self.model.compile(optimizer='adam', loss='mse')
        
        # Train
        history = self.model.fit(X, X, epochs=epochs, batch_size=32, validation_split=0.1, verbose=1)
        
        # Calculate threshold
        reconstructions = self.model.predict(X)
        mse = np.mean(np.power(X - reconstructions, 2), axis=1)
        self.threshold = float(np.mean(mse) + 2 * np.std(mse))
        
        # Save
        self.model.save(self.model_path)
        with open(self.dept_encoder_path, 'wb') as f:
            pickle.dump(self.dept_encoder, f)
        with open(self.task_encoder_path, 'wb') as f:
            pickle.dump(self.task_encoder, f)
        with open(self.scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
        with open(self.threshold_path, 'wb') as f:
            pickle.dump(self.threshold, f)
            
        return history.history

    def detect_anomalies(self, data):
        if not data:
            return []
            
        X = self._prepare_data(data, is_training=False)
        reconstructions = self.model.predict(X)
        mse = np.mean(np.power(X - reconstructions, 2), axis=1)
        
        results = []
        for i, error in enumerate(mse):
            is_anomaly = bool(error > self.threshold)
            # Calculate a risk score between 0 and 1
            # If error == threshold, score = 0.5. If error is much larger, approaches 1.0
            risk_score = min(1.0, float(error / (self.threshold * 2))) if self.threshold > 0 else 0.0
            
            item_data = {
                "item_index": i,
                "reconstruction_error": float(error),
                "is_anomaly": is_anomaly,
                "risk_score": risk_score
            }
            if "instance_id" in data[i]:
                item_data["instance_id"] = data[i]["instance_id"]
                
            results.append(item_data)
            
        return results
