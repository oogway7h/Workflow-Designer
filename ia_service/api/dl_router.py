# Deep Learning Router - New endpoints for TensorFlow-based models
# This router is separate from the existing Groq-based routes

from fastapi import APIRouter, HTTPException
from domain.dl_models import (
    RouteIntentRequest, RouteIntentResponse,
    AnalyzeBottlenecksRequest, AnalyzeBottlenecksResponse, BottleneckItem,
    BestRouteRequest, BestRouteResponse, CandidateEstimate,
    TrainModelsRequest, TrainModelsResponse, DlStatusResponse
)
from pymongo import MongoClient
from dotenv import dotenv_values
import logging
import os

logger = logging.getLogger(__name__)

dl_router = APIRouter(prefix="/dl", tags=["Deep Learning"])

# Lazy-load models to avoid slow startup when models aren't trained yet
_nlp_classifier = None
_bottleneck_detector = None
_completion_predictor = None


def _get_nlp_classifier():
    global _nlp_classifier
    if _nlp_classifier is None:
        from deeplearning.nlp_intent_classifier import NlpIntentClassifier
        _nlp_classifier = NlpIntentClassifier()
    return _nlp_classifier


def _get_bottleneck_detector():
    global _bottleneck_detector
    if _bottleneck_detector is None:
        from deeplearning.bottleneck_autoencoder import BottleneckDetector
        _bottleneck_detector = BottleneckDetector()
    return _bottleneck_detector


def _get_completion_predictor():
    global _completion_predictor
    if _completion_predictor is None:
        from deeplearning.completion_predictor import CompletionPredictor
        _completion_predictor = CompletionPredictor()
    return _completion_predictor


@dl_router.post("/route-intent", response_model=RouteIntentResponse,
                summary="DL - Enrutador de intención a política (TensorFlow)")
async def dl_route_intent(request: RouteIntentRequest):
    """
    Usa un modelo LSTM entrenado con TensorFlow para clasificar el texto
    del usuario y determinar qué política (policy_id) le corresponde.
    """
    try:
        classifier = _get_nlp_classifier()
        if not classifier.is_trained():
            raise HTTPException(
                status_code=503,
                detail="El modelo NLP no ha sido entrenado aún. Ejecute el script de entrenamiento primero."
            )
        result = classifier.predict(request.text)
        return RouteIntentResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en route-intent DL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@dl_router.post("/analyze-bottlenecks", response_model=AnalyzeBottlenecksResponse,
                summary="DL - Detección de cuellos de botella (Autoencoder TensorFlow)")
async def dl_analyze_bottlenecks(request: AnalyzeBottlenecksRequest):
    """
    Usa un Autoencoder entrenado con TensorFlow para detectar anomalías
    en los tiempos de ejecución de trámites activos.
    """
    try:
        detector = _get_bottleneck_detector()
        if not detector.is_trained():
            raise HTTPException(
                status_code=503,
                detail="El modelo Autoencoder no ha sido entrenado aún. Ejecute el script de entrenamiento primero."
            )
        items = [item.model_dump() for item in request.items]
        results = detector.detect_anomalies(items)
        bottleneck_items = [BottleneckItem(**r) for r in results]
        return AnalyzeBottlenecksResponse(results=bottleneck_items)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en analyze-bottlenecks DL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@dl_router.post("/best-route", response_model=BestRouteResponse,
                summary="DL - Mejor ruta / asignación óptima (Regresión TensorFlow)")
async def dl_best_route(request: BestRouteRequest):
    """
    Usa un modelo de regresión TensorFlow para predecir el tiempo de
    finalización y sugerir el empleado más rápido.
    """
    try:
        predictor = _get_completion_predictor()
        if not predictor.is_trained():
            raise HTTPException(
                status_code=503,
                detail="El modelo de regresión no ha sido entrenado aún. Ejecute el script de entrenamiento primero."
            )
        candidates = [c.model_dump() for c in request.candidates]
        result = predictor.find_best_assignee(
            request.policy_id, request.activity_id, candidates
        )
        return BestRouteResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en best-route DL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@dl_router.post("/train", response_model=TrainModelsResponse,
                summary="DL - Entrenar todos los modelos con datos existentes")
async def dl_train_models(request: TrainModelsRequest):
    """
    Entrena los tres modelos de Deep Learning usando los datos de entrenamiento
    previamente generados en ia_service/deeplearning/training_data/.
    """
    import pandas as pd

    results = {}
    training_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "deeplearning", "training_data")

    # Train NLP classifier
    try:
        nlp_csv = os.path.join(training_data_dir, "nlp_training_data.csv")
        if os.path.exists(nlp_csv):
            df = pd.read_csv(nlp_csv)
            classifier = _get_nlp_classifier()
            history = classifier.train(df["text"].tolist(), df["policy_id"].tolist(), epochs=request.epochs_nlp)
            results["nlp_classifier"] = {"status": "trained", "final_accuracy": history.get("accuracy", 0)}
        else:
            results["nlp_classifier"] = {"status": "skipped", "reason": "No training data found"}
    except Exception as e:
        results["nlp_classifier"] = {"status": "error", "reason": str(e)}

    # Train bottleneck autoencoder
    try:
        bottleneck_csv = os.path.join(training_data_dir, "bottleneck_training_data.csv")
        if os.path.exists(bottleneck_csv):
            df = pd.read_csv(bottleneck_csv)
            normal_df = df[df["is_anomaly"] == False]
            detector = _get_bottleneck_detector()
            normal_data = normal_df.to_dict("records")
            history = detector.train(normal_data, epochs=request.epochs_bottleneck)
            results["bottleneck_detector"] = {"status": "trained", "final_loss": history.get("loss", 0)}
        else:
            results["bottleneck_detector"] = {"status": "skipped", "reason": "No training data found"}
    except Exception as e:
        results["bottleneck_detector"] = {"status": "error", "reason": str(e)}

    # Train completion predictor
    try:
        completion_csv = os.path.join(training_data_dir, "completion_training_data.csv")
        if os.path.exists(completion_csv):
            df = pd.read_csv(completion_csv)
            predictor = _get_completion_predictor()
            data = df.to_dict("records")
            history = predictor.train(data, epochs=request.epochs_completion)
            results["completion_predictor"] = {"status": "trained", "final_loss": history.get("loss", 0)}
        else:
            results["completion_predictor"] = {"status": "skipped", "reason": "No training data found"}
    except Exception as e:
        results["completion_predictor"] = {"status": "error", "reason": str(e)}

    return TrainModelsResponse(results=results)


@dl_router.get("/status", response_model=DlStatusResponse,
               summary="DL - Estado de entrenamiento del asistente")
async def dl_status():
    """
    Compara las políticas activas de la base de datos con las clases cargadas
    en el modelo de clasificación de intenciones LSTM para verificar si se
    requiere reentrenar.
    """
    try:
        classifier = _get_nlp_classifier()
        is_trained = classifier.is_trained()
        
        backend_env_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "backend", ".env"))
        config = dotenv_values(backend_env_path)
        mongo_uri = config.get("MONGODB_URI")
        
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        if db is None:
            db = client["workflow_engine_db"]
            
        # Obtener todas las políticas activas
        db_policies = list(db["policies"].find({"state": "ACTIVE"}))
        db_policy_uuids = [p["uuid"] for p in db_policies if "uuid" in p]
        
        trained_classes = []
        if is_trained and classifier.label_encoder is not None:
            # label_encoder.classes_ holds the policy UUIDs
            trained_classes = [str(cls) for cls in classifier.label_encoder.classes_]
            
        # Encontrar cuáles políticas activas no están en las clases entrenadas
        missing_policies = [u for u in db_policy_uuids if u not in trained_classes]
        
        retraining_needed = not is_trained or len(missing_policies) > 0
        
        return DlStatusResponse(
            is_trained=is_trained,
            retraining_needed=retraining_needed,
            trained_classes_count=len(trained_classes),
            db_policies_count=len(db_policy_uuids),
            missing_policies_count=len(missing_policies),
            missing_policies=missing_policies
        )
    except Exception as e:
        logger.error(f"Error en status DL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

