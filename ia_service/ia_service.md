
# Especificación Técnica: Microservicio de IA con FastAPI y Gemini

## 1. Contexto y Objetivo
Eres un Desarrollador Backend Senior en Python/FastAPI experto en integraciones de IA.
El objetivo es crear un microservicio independiente que actuará como el "Cerebro de IA" para un Motor de Workflows empresarial. Este microservicio recibirá peticiones HTTP desde un backend en Java (Spring Boot) y utilizará la API de Google Gemini para procesar lenguaje natural y devolver datos estructurados.

## 2. Stack Tecnológico Requerido
- Python 3.10+
- FastAPI (Framework web)
- Uvicorn (Servidor ASGI)
- `google-generativeai` (SDK oficial de Gemini)
- `python-dotenv` (Para manejo de variables de entorno)
- `pydantic` (Para validación de esquemas de entrada y salida)

## 3. Configuración Inicial (Instrucciones)
1. Inicializar el proyecto con una estructura limpia(clean architecture).
2. Crear un archivo `.env.example` que incluya `GEMINI_API_KEY=tu_clave_aqui`.
3. Configurar CORS en FastAPI para permitir peticiones (aunque inicialmente solo lo llamará Spring Boot, es útil para pruebas en Swagger).
4. Configurar el cliente de `google.generativeai` al arrancar la app usando la API Key del `.env`.

## 4. Endpoints a Implementar

### Endpoint 1: Asistente de Llenado de Formularios
**Ruta:** `POST /api/v1/ai/suggest-field`
**Objetivo:** Ayudar a un "Funcionario" a llenar un campo difícil basado en el contexto de la tarea.
**Payload de Entrada (Pydantic Model):**
```json
{
  "policy_name": "Solicitud de Viáticos",
  "task_name": "Justificación del Viaje",
  "field_name": "motivo_comercial",
  "user_context": "viajo a madrid a cerrar contrato con cliente Acme"
}
```


### Endpoint 2: Generador de Políticas (Text-to-Workflow)
**Ruta:** `POST /api/v1/ai/generate-policy`
**Objetivo:** Convertir una descripción en lenguaje natural en un JSON estructurado que el frontend (Angular) pueda dibujar en el lienzo.
**Payload de Entrada:**

```JSON
{
  "prompt": "Crea un proceso para solicitar vacaciones. Primero el empleado solicita, luego el gerente aprueba y finalmente RRHH registra."
}
```
Lógica del Servicio (Prompt Engineering):

Usar el modelo gemini-1.5-flash (por ser rápido y bueno estructurando JSON).

Construir un prompt estricto que instruya a Gemini a devolver ÚNICAMENTE un objeto JSON válido.

El prompt debe incluir instrucciones para generar la estructura básica de una Policy: name, description, un arreglo de lanes (calles), un arreglo de activityNodes (nodos tipo START_TASK, USER_TASK, END_TASK asignados a un laneId) y un arreglo de transitions.

Asegurar de indicar a Gemini que no use bloques de código (```json) en la respuesta, o limpiarlos antes de parsearlos.
Salida Esperada: El JSON estructurado de la Política.

### 5. Criterios de Aceptación
El código debe estar tipado y seguir las buenas prácticas de FastAPI.

Incluir manejo de excepciones (ej. si la API de Gemini falla o se agota la cuota, devolver un HTTP 503).

Autogeneración de la documentación Swagger en /docs.