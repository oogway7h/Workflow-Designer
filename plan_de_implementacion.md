# Unificación del Asistente IA (Copiloto) y Edición de Diagramas

Este plan detalla los pasos para resolver el problema de sobreescritura de diagramas y la interfaz fragmentada, unificando la experiencia en un componente "Copiloto" en Angular y actualizando FastAPI para permitir la edición incremental de diagramas con Llama 3 (Groq).

## Solución Propuesta

### 1. Frontend (Angular) - Unificación de la Interfaz (UX)
- **Eliminación de botones sueltos:** Se limpiará la UI del diseñador (`policy-designer.component.ts`) eliminando acciones dispersas de IA.
- **Creación del Copiloto:** Se desarrollará un nuevo componente de Asistente Inteligente (ej. `CopilotComponent`) que funcionará como chat o panel lateral unificado.
- **Envío de Contexto:** Cuando el usuario pida cambios sobre el diagrama actual, Angular serializará el lienzo (`nodes`, `transitions`, `lanes`) y lo enviará junto al texto del usuario en el payload hacia FastAPI.

### 2. Backend (FastAPI) - Modelos Pydantic (`domain/models.py`)
- Se actualizará `GeneratePolicyRequest` agregando un campo `current_diagram_json: dict | None = None` para recibir el estado del diagrama existente.

### 3. Backend (FastAPI) - Lógica del Enrutador (`application/ai_service.py`)
- **Prompt Dinámico:** En el método `generate_policy`, la lógica inyectará el JSON actual si viene en la petición.
- **Regla Estricta para Llama 3:** El prompt indicará: *"Aquí tienes el JSON actual del diagrama. El usuario pide: '[petición]'. Devuélveme el JSON modificado, añadiendo/modificando el nuevo nodo sin borrar los anteriores ni su estructura."*
- **Intent Router (`nlp_intent`):** Se adaptará para comprender mejor las diferencias entre "Crear de cero" y "Modificar".

## Pruebas de Verificación
1. **Generar desde cero:** Validar que "Crea un proceso de permisos" genere el flujo entero.
2. **Modificar:** Validar que pedir "Agrega un nodo de notificación" sobre el diagrama existente añada la transición y nodo nuevo sin eliminar el flujo previo.
