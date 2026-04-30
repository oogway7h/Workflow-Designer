from fastapi import APIRouter
from domain.models import (
    SuggestFieldRequest, GeneratePolicyRequest, SuggestFieldResponse,
    ChatRequest, ChatResponse,
    RecommendAssigneeRequest, RecommendAssigneeResponse,
    AnalyticsBottlenecksRequest, AnalyticsBottlenecksResponse,
    AutoAssignPolicyRequest, AutoAssignPolicyResponse
)
from application.ai_service import AIService

router = APIRouter()
ai_service = AIService()

@router.post("/suggest-field", response_model=SuggestFieldResponse, summary="Asistente de Llenado de Formularios")
async def suggest_field(request: SuggestFieldRequest):
    """
    Ayuda a un 'Funcionario' a llenar un campo difícil basado en el contexto de la tarea.
    """
    suggestion = ai_service.suggest_field(request)
    return SuggestFieldResponse(suggestion=suggestion)

@router.post("/generate-policy", summary="Generador de Políticas (Text-to-Workflow)")
async def generate_policy(request: GeneratePolicyRequest):
    """
    Convierte una descripción en lenguaje natural en un JSON estructurado que el frontend pueda dibujar en el lienzo.
    """
    policy_json = ai_service.generate_policy(request)
    return policy_json

@router.post("/assistant/chat", response_model=ChatResponse, summary="Asistente Contextual (Tour e Interfaz)")
async def assistant_chat(request: ChatRequest):
    """
    Actúa como un copilot incrustado en el frontend.
    """
    reply = ai_service.assistant_chat(request)
    return ChatResponse(reply=reply)

@router.post("/workflows/recommend-assignee", response_model=RecommendAssigneeResponse, summary="Ruteo Inteligente de Tareas (Task Assignment)")
async def recommend_assignee(request: RecommendAssigneeRequest):
    """
    Asigna la tarea al empleado más óptimo evaluando su carga actual y su eficiencia histórica.
    """
    recommendation = ai_service.recommend_assignee(request)
    return RecommendAssigneeResponse(**recommendation)

@router.post("/analytics/bottlenecks", response_model=AnalyticsBottlenecksResponse, summary="Detección de Cuellos de Botella (Process Mining)")
async def analytics_bottlenecks(request: AnalyticsBottlenecksRequest):
    """
    Analiza los tiempos promedio de ejecución de una política y detecta anomalías o retrasos estructurales.
    """
    bottleneck_analysis = ai_service.analytics_bottlenecks(request)
    return AnalyticsBottlenecksResponse(**bottleneck_analysis)

@router.post("/workflows/auto-assign-policy", response_model=AutoAssignPolicyResponse, summary="Asignación automática de empleados a actividades de una política")
async def auto_assign_policy(request: AutoAssignPolicyRequest):
    """
    Usa IA para asignar automáticamente el empleado más apto a cada actividad de una política.
    """
    result = ai_service.auto_assign_policy(request)
    return AutoAssignPolicyResponse(**result)
