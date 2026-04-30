import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

def configure_groq():
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY no está configurada en las variables de entorno.")
    else:
        logger.info("Entorno configurado correctamente para el cliente de Groq.")
