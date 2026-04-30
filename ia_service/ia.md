# Especificación Técnica: Microservicio de IA con FastAPI y Groq (Llama 3)

## 1. Contexto y Objetivo

Eres un Desarrollador Backend Senior en Python/FastAPI. El objetivo es crear un microservicio independiente que actuará como el "Cerebro de IA" para un Motor de Workflows empresarial.
Utilizaremos la API de Groq (con el modelo `llama3-70b-8192` o `llama3-8b-8192`) para procesar lenguaje natural y devolver datos estructurados, ya que ofrece una latencia ultrabaja y compatibilidad con el formato de OpenAI.

## 2. Stack Tecnológico Requerido

- Python 3.10+
- FastAPI (Framework web)
- Uvicorn (Servidor ASGI)
- `groq` (SDK oficial de Groq)
- `python-dotenv` (Para manejo de variables de entorno)
- `pydantic` (Para validación de esquemas)

## 3. Configuración Inicial (Instrucciones)

1. Inicializar el proyecto y crear un archivo `.env` que incluya `GROQ_API_KEY=tu_clave_aqui`.
2. Configurar el cliente de Groq al arrancar la app:
   ```python
   import os
   from groq import Groq
   from dotenv import load_dotenv
   load_dotenv()
   client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
   ```

### 4. Endpoints a Implementar

Endpoint 1: Asistente de Llenado de Formularios
Ruta: POST /api/v1/ai/suggest-field
Payload de Entrada (Pydantic Model):

policy_name (str)

task_name (str)

field_name (str)

user_context (str)

Lógica del Servicio:

Usar client.chat.completions.create(...) con el modelo llama3-8b-8192.

System Message: "Eres un asistente corporativo. Ayuda a llenar formularios. Responde SOLO con el texto que el usuario debe poner en el campo, sin saludos ni explicaciones."

User Message: "Política: {policy_name}, Tarea: {task_name}, Campo a llenar: {field_name}. Notas del usuario: {user_context}"
Salida Esperada: JSON con suggestion: string.

### Endpoint 2: Generador de Políticas (Text-to-Workflow)

Ruta: POST /api/v1/ai/generate-policy
Payload de Entrada:

prompt (str)

Lógica del Servicio:

Usar el modelo llama3-70b-8192 (es mejor para JSON complejo).

System Message: "Eres un experto en BPMN y JSON. El usuario te dará una descripción de un proceso. Debes devolver ÚNICAMENTE un objeto JSON válido que represente el proceso. El JSON debe tener: 'name', 'description', arreglo de 'lanes' (con id, name), arreglo de 'activityNodes' (con uuid, description, type, laneId) y arreglo de 'transitions' (con sourceActivityId, targetActivityId). NO uses bloques de código (```json)."

Forzar la salida a JSON (Si Groq soporta response_format={"type": "json_object"}, úsalo; si no, limpiar el string resultante).
Salida Esperada: El JSON estructurado de la Política.

### 5. Criterios de Aceptación

Tipado estricto con Pydantic.

Manejo de excepciones (HTTP 500/503) si la API de Groq falla.

Autogeneración de Swagger en /docs.
