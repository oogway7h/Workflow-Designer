# Pydantic models for Deep Learning endpoints
# These are SEPARATE from the existing domain/models.py to avoid conflicts

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# --- Route Intent (NLP Classifier) ---

class RouteIntentRequest(BaseModel):
    text: str = Field(..., description="Texto en lenguaje natural del usuario")


class PolicyPrediction(BaseModel):
    policy_id: str
    confidence: float


class RouteIntentResponse(BaseModel):
    policy_id: str = Field(..., description="ID de la política con mayor probabilidad")
    confidence: float = Field(..., description="Nivel de confianza (0-1)")
    all_predictions: List[PolicyPrediction] = Field(
        default_factory=list,
        description="Todas las predicciones ordenadas por confianza"
    )


# --- Bottleneck Detection (Autoencoder) ---

class BottleneckInputItem(BaseModel):
    department_id: str
    day_of_week: int = Field(..., ge=0, le=6)
    hour_of_day: int = Field(..., ge=0, le=23)
    duration_hours: float
    task_id: str
    instance_id: Optional[str] = None


class AnalyzeBottlenecksRequest(BaseModel):
    items: List[BottleneckInputItem]


class BottleneckItem(BaseModel):
    item_index: int
    reconstruction_error: float
    is_anomaly: bool
    risk_score: float
    instance_id: Optional[str] = None


class AnalyzeBottlenecksResponse(BaseModel):
    results: List[BottleneckItem]


# --- Best Route (Completion Predictor) ---

class CandidateInput(BaseModel):
    employee_id: str
    pending_tasks: int


class BestRouteRequest(BaseModel):
    policy_id: str
    activity_id: str
    candidates: List[CandidateInput]


class CandidateEstimate(BaseModel):
    employee_id: str
    estimated_hours: float


class BestRouteResponse(BaseModel):
    best_employee_id: str
    estimated_hours: float
    all_estimates: List[CandidateEstimate] = Field(default_factory=list)


# --- Train Models ---

class TrainModelsRequest(BaseModel):
    epochs_nlp: int = Field(default=50, description="Épocas para el clasificador NLP")
    epochs_bottleneck: int = Field(default=100, description="Épocas para el autoencoder")
    epochs_completion: int = Field(default=100, description="Épocas para el predictor de tiempo")


class TrainModelsResponse(BaseModel):
    results: Dict[str, Any]


# --- Model Training Status ---

class DlStatusResponse(BaseModel):
    is_trained: bool
    retraining_needed: bool
    trained_classes_count: int
    db_policies_count: int
    missing_policies_count: int
    missing_policies: List[str]

