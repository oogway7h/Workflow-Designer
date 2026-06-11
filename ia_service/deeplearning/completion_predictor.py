import os
import pickle
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense
from sklearn.preprocessing import LabelEncoder, StandardScaler

class CompletionPredictor:
    def __init__(self, model_dir='deeplearning/saved_models'):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.model_path = os.path.join(self.model_dir, 'completion_predictor.keras')
        self.policy_encoder_path = os.path.join(self.model_dir, 'policy_encoder.pkl')
        self.activity_encoder_path = os.path.join(self.model_dir, 'activity_encoder.pkl')
        self.employee_encoder_path = os.path.join(self.model_dir, 'employee_encoder.pkl')
        self.scaler_path = os.path.join(self.model_dir, 'completion_scaler.pkl')
        
        self.model = None
        self.policy_encoder = None
        self.activity_encoder = None
        self.employee_encoder = None
        self.scaler = None
        
        self._load_if_exists()

    def _load_if_exists(self):
        paths = [self.model_path, self.policy_encoder_path, self.activity_encoder_path, 
                 self.employee_encoder_path, self.scaler_path]
        if all(os.path.exists(p) for p in paths):
            self.model = load_model(self.model_path)
            with open(self.policy_encoder_path, 'rb') as f:
                self.policy_encoder = pickle.load(f)
            with open(self.activity_encoder_path, 'rb') as f:
                self.activity_encoder = pickle.load(f)
            with open(self.employee_encoder_path, 'rb') as f:
                self.employee_encoder = pickle.load(f)
            with open(self.scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)

    def is_trained(self):
        return self.model is not None

    def _encode_feature(self, encoder, value):
        if value in encoder.classes_:
            return encoder.transform([value])[0]
        return 0 # Fallback for unknown

    def train(self, data, epochs=100):
        # Extract columns
        policies = [str(d['policy_id']) for d in data]
        activities = [str(d['activity_id']) for d in data]
        employees = [str(d['employee_id']) for d in data]
        pending_tasks = [float(d['pending_tasks']) for d in data]
        y = np.array([float(d['completion_hours']) for d in data])
        
        # Fit encoders
        self.policy_encoder = LabelEncoder()
        self.activity_encoder = LabelEncoder()
        self.employee_encoder = LabelEncoder()
        
        pol_enc = self.policy_encoder.fit_transform(policies)
        act_enc = self.activity_encoder.fit_transform(activities)
        emp_enc = self.employee_encoder.fit_transform(employees)
        
        # Stack features
        X = np.column_stack((pol_enc, act_enc, emp_enc, pending_tasks))
        
        # Fit scaler
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        input_dim = X_scaled.shape[1]
        
        # Build Model
        self.model = Sequential([
            Dense(64, activation='relu', input_shape=(input_dim,)),
            Dense(32, activation='relu'),
            Dense(16, activation='relu'),
            Dense(1, activation='linear')
        ])
        
        self.model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
        # Train
        history = self.model.fit(X_scaled, y, epochs=epochs, batch_size=32, validation_split=0.1, verbose=1)
        
        # Save
        self.model.save(self.model_path)
        with open(self.policy_encoder_path, 'wb') as f:
            pickle.dump(self.policy_encoder, f)
        with open(self.activity_encoder_path, 'wb') as f:
            pickle.dump(self.activity_encoder, f)
        with open(self.employee_encoder_path, 'wb') as f:
            pickle.dump(self.employee_encoder, f)
        with open(self.scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
            
        return history.history

    def predict(self, policy_id, activity_id, employee_id, pending_tasks):
        pol_enc = self._encode_feature(self.policy_encoder, str(policy_id))
        act_enc = self._encode_feature(self.activity_encoder, str(activity_id))
        emp_enc = self._encode_feature(self.employee_encoder, str(employee_id))
        
        features = np.array([[pol_enc, act_enc, emp_enc, float(pending_tasks)]])
        scaled_features = self.scaler.transform(features)
        
        pred = self.model.predict(scaled_features)[0][0]
        return max(0.1, float(pred)) # Ensure positive time

    def find_best_assignee(self, policy_id, activity_id, candidates):
        if not candidates:
            return {}
            
        estimates = []
        for c in candidates:
            emp_id = str(c['employee_id'])
            pending = int(c['pending_tasks'])
            est_hours = self.predict(policy_id, activity_id, emp_id, pending)
            estimates.append({
                "employee_id": emp_id,
                "estimated_hours": est_hours
            })
            
        # Sort by lowest time
        estimates.sort(key=lambda x: x["estimated_hours"])
        
        return {
            "best_employee_id": estimates[0]["employee_id"],
            "estimated_hours": estimates[0]["estimated_hours"],
            "all_estimates": estimates
        }
