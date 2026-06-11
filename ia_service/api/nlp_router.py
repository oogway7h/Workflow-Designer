from fastapi import APIRouter
from domain.models import (
    NlpNavigateRequest, NlpNavigateResponse, NlpFillFormRequest, NlpFillFormResponse,
    NlpIntentRequest, NlpIntentResponse, NlpCompileReportRequest, NlpCompileReportResponse,
    NlpAnalyzeDataRequest, NlpAnalyzeDataResponse
)
from application.ai_service import AIService

nlp_router = APIRouter(prefix="/nlp", tags=["NLP"])
ai_service = AIService()


@nlp_router.post("/intent", response_model=NlpIntentResponse, summary="NLP - Clasificador de Intención")
async def nlp_intent(request: NlpIntentRequest):
    """
    Clasifica la intención del texto hablado: navigate | ask | generate_policy | fill_form
    """
    result = ai_service.nlp_intent(request)
    return NlpIntentResponse(intent=result.get("intent", "ask"), spoken_text=result.get("spoken_text", request.spoken_text))


@nlp_router.post("/navigate", response_model=NlpNavigateResponse, summary="NLP - Reconocimiento de Intención de Navegación")
async def nlp_navigate(request: NlpNavigateRequest):
    """
    Recibe un texto libre en lenguaje natural y devuelve la ruta a la que el usuario quiere navegar.
    """
    result = ai_service.nlp_navigate(request)
    return NlpNavigateResponse(route=result.get("route", "/unknown"))


@nlp_router.post("/fill-form", response_model=NlpFillFormResponse, summary="NLP - Extractor de Entidades para Formularios")
async def nlp_fill_form(request: NlpFillFormRequest):
    """
    Recibe texto libre y un esquema JSON de formulario, y devuelve el formulario rellenado con los datos extraídos.
    """
    result = ai_service.nlp_fill_form(request)
    return NlpFillFormResponse(filled_form=result.get("filled_form", {}))


@nlp_router.post("/compile-report", response_model=NlpCompileReportResponse, summary="NLP - Compilador de Reportes y KPIs")
async def nlp_compile_report(request: NlpCompileReportRequest):
    """
    Recibe un prompt en lenguaje natural y genera la estructura JSON (pipeline, columnas, KPIs) para un reporte.
    """
    result = ai_service.compile_report(request)
    return NlpCompileReportResponse(**result)


@nlp_router.post("/analyze-data", response_model=NlpAnalyzeDataResponse, summary="NLP - Análisis Cognitivo de Datos del Reporte")
async def nlp_analyze_data(request: NlpAnalyzeDataRequest):
    """
    Recibe la pregunta del usuario y los datos del reporte para realizar un análisis textual.
    """
    result = ai_service.analyze_report_data(request)
    return NlpAnalyzeDataResponse(**result)

