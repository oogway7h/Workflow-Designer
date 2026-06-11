import os
import requests
import json
import pandas as pd
import sys

# Set up paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
# Add BASE_DIR to sys.path so we can import from deeplearning
sys.path.append(BASE_DIR)

from data_generator import generate_data, ALL_POLICIES
TRAINING_DATA_DIR = os.path.join(BASE_DIR, 'deeplearning', 'training_data')
SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "http://localhost:8080")

def fetch_data(token):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    print(f"Fetching data from {SPRING_BOOT_URL}/api/v1/export/training-data...")
    try:
        response = requests.get(f"{SPRING_BOOT_URL}/api/v1/export/training-data", headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching real data: {e}")
        print("Using dummy data instead for training.")
        return {
            "policies": ALL_POLICIES,
            "users": [
                {"uuid": "e121cbea-1209-4fe7-ad22-6cf09caf5b95", "departmentId": "e6edcb81-4782-44f0-af6d-1e9e184c77ba"}, # Gerencia
                {"uuid": "bebe41a9-85fc-43f3-a125-5c7f72b0898d", "departmentId": "17775f19-8c66-41b3-bd38-919b0fe10b8f"}, # RRHH
                {"uuid": "e1c69265-87e8-417b-b13a-2ae72c53d4e3", "departmentId": "f036cecc-192b-4e1e-bdc2-c95608f24fe9"}, # TI
                {"uuid": "4cd6a83f-a8b6-4b56-854d-5d3693ec4ab4", "departmentId": "5fd7b0ae-2619-4038-a52e-26a0576c4819"}, # Finanzas
                {"uuid": "u_org_methods", "departmentId": "f5ba7581-b2ac-4b3a-830e-64ab112f975a"}, # Organización y Métodos
                {"uuid": "u_legal", "departmentId": "5f56f693-5a38-4ca2-96c0-7bba750fc7a6"}, # Legal
                {"uuid": "u_customer_service", "departmentId": "31ece703-f961-4e8e-a5c5-cd5c5b47e3db"}, # Atención al cliente
                {"uuid": "u_operations", "departmentId": "390714b2-977f-4e5c-bd1e-5f282ff785ef"}  # Operaciones
            ]
        }

def train_all():
    # 1. Fetch data and generate CSVs
    print("--- Phase 1: Data Generation ---")
    token = os.getenv("JWT_TOKEN", "") # Ideally passed via env
    data = fetch_data(token)
    generate_data(data.get("policies", []), data.get("users", []), data.get("instances", []), TRAINING_DATA_DIR)
    
    # 2. Train NLP Model
    print("\n--- Phase 2: Training NLP Classifier ---")
    from deeplearning.nlp_intent_classifier import NlpIntentClassifier
    nlp_csv = os.path.join(TRAINING_DATA_DIR, "nlp_training_data.csv")
    if os.path.exists(nlp_csv):
        df = pd.read_csv(nlp_csv)
        nlp_model = NlpIntentClassifier()
        # Ensure strings
        texts = df["text"].astype(str).tolist()
        labels = df["policy_id"].astype(str).tolist()
        nlp_model.train(texts, labels, epochs=40)
    else:
        print(f"File not found: {nlp_csv}")
        
    # 3. Train Bottleneck Autoencoder
    print("\n--- Phase 3: Training Bottleneck Autoencoder ---")
    from deeplearning.bottleneck_autoencoder import BottleneckDetector
    bottle_csv = os.path.join(TRAINING_DATA_DIR, "bottleneck_training_data.csv")
    if os.path.exists(bottle_csv):
        df = pd.read_csv(bottle_csv)
        normal_data = df[df["is_anomaly"] == False].to_dict("records")
        bottle_model = BottleneckDetector()
        bottle_model.train(normal_data, epochs=5)
    else:
        print(f"File not found: {bottle_csv}")
        
    # 4. Train Completion Predictor
    print("\n--- Phase 4: Training Completion Predictor ---")
    from deeplearning.completion_predictor import CompletionPredictor
    comp_csv = os.path.join(TRAINING_DATA_DIR, "completion_training_data.csv")
    if os.path.exists(comp_csv):
        df = pd.read_csv(comp_csv)
        comp_data = df.to_dict("records")
        comp_model = CompletionPredictor()
        comp_model.train(comp_data, epochs=5)
    else:
        print(f"File not found: {comp_csv}")
        
    print("\nTraining complete! All models saved to deeplearning/saved_models/")

if __name__ == "__main__":
    train_all()
