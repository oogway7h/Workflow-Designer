from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.groq_client import configure_groq

# Configurar variables de entorno antes de cargar las rutas y servicios
configure_groq()

from api.routes import router as ai_router
from api.nlp_router import nlp_router
from api.dl_router import dl_router
import uvicorn
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown

app = FastAPI(
    title="IA Service - Motor de Workflows",
    description="Microservicio de IA con FastAPI y Gemini para el Motor de Workflows",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todos los orígenes para pruebas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router, prefix="/api/v1/ai")
app.include_router(nlp_router, prefix="/api/v1/ai")
app.include_router(dl_router, prefix="/api/v1/ai")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
