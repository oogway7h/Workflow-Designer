from groq import Groq
import os
from fastapi import HTTPException
from domain.models import (
    SuggestFieldRequest, GeneratePolicyRequest, ModifyDiagramRequest,
    ChatRequest, RecommendAssigneeRequest, AnalyticsBottlenecksRequest,
    NlpNavigateRequest, NlpFillFormRequest, NlpIntentRequest
)
import json
import re

class AIService:
    def __init__(self):
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        # Modelos requeridos
        self.model_fast = 'llama-3.3-70b-versatile'
        self.model_complex = 'llama-3.1-8b-instant'

    def suggest_field(self, request: SuggestFieldRequest) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model_fast,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente corporativo. Ayuda a llenar formularios. Responde SOLO con el texto que el usuario debe poner en el campo, sin saludos ni explicaciones."
                    },
                    {
                        "role": "user",
                        "content": f"Política: {request.policy_name}, Tarea: {request.task_name}, Campo a llenar: {request.field_name}. Notas del usuario: {request.user_context}"
                    }
                ]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def generate_policy(self, request: GeneratePolicyRequest) -> dict:
        departments_json = json.dumps(request.departments, ensure_ascii=False) if request.departments else "[]"
        
        system_prompt = f"""Eres un experto en modelado funcional BPMN y UML 2.5. El usuario requiere generar un flujo de trabajo a partir de su descripción dictada.
REGLAS ESTRICTAS PARA EL JSON:
1. Lanes: Usa ÚNICAMENTE departamentos de esta lista: {departments_json}. NO inventes ni agregues departamentos que no estén en esa lista. Si la lista está vacía, usa un lane genérico con id 'default' y name 'General'.
2. Nodos ('activityNodes'): Cada uno DEBE incluir los campos: 'uuid' (string único), 'name' (string), 'description' (string), 'state' (ver opciones permitidas), 'x' (usa 0), 'y' (usa 0), 'laneId' (asignado a uno disponible), 'assigneeId' (null es válido).
3. Formularios ('formSchemaJson'): Si el usuario especifica explícitamente que una actividad debe tener un formulario (inputs, grids, tablas), genéralo dentro del campo 'formSchemaJson'. De lo contrario, usa un objeto vacío {{}}.
3. Atributo 'state' para los nodos (PUNTOS CLAVE):
   - 'INITIAL': Nodo obligatorio al inicio del flujo.
   - 'FINAL': Nodo obligatorio al terminar un camino del flujo (puede haber varios).
   - 'ACTIVITY': Para tareas o acciones regulares.
   - 'DECISION': OBLIGATORIO usarlo para bifurcar el flujo cuando hay condiciones, aprobaciones o caminos lógicos ("si...", "en caso de...").
   - 'FORK': OBLIGATORIO usarlo para ejecutar múltiples tareas en paralelo (al mismo tiempo).
   - 'OBJECT': Nodo de estado/objeto UML — representa un documento, archivo, o estado intermedio que fluye entre actividades. Úsalo cuando se mencionen documentos, archivos, solicitudes o resultados intermedios.
   - 'SIGNAL': Nodo de envío de señal UML — representa el envío de una notificación, mensaje o señal a un sistema externo o persona.
4. Transiciones ('transitions'): DEBEN tener 'sourceActivityId' (uuid origen), 'targetActivityId' (uuid destino), 'condition' (texto con la condición si sale de un nodo 'DECISION', o null si sale de cualquier otro nodo) y 'dashed' (boolean: true si la transición es un flujo de objeto entre nodos OBJECT/SIGNAL, false para flujos de control normales).
5. Lógica de bifurcación: Si creas un nodo 'DECISION', asegúrate de crear al menos 2 'transitions' de salida con diferentes condiciones (ej. "Aprobado", "Rechazado").
6. Estructura RAÍZ: DEBE incluir 'name', 'description', 'managerId' (null válido), 'ownerId' (null válido), 'activityNodes' (array), 'transitions' (array), 'lanes' (array).
Devuelve ÚNICAMENTE el JSON representando este proceso, detectando todos los forks y decisiones de la narrativa. NO uses bloques de código alrededor."""

        try:
            response = self.client.chat.completions.create(
                model=self.model_complex,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": request.prompt
                    }
                ]
            )
            response_text = response.choices[0].message.content.strip()
            
            # Limpiar por si acaso el modelo devuelve bloques de código
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            response_text = response_text.strip()
            
            # Intentar parsear el JSON
            try:
                parsed_json = json.loads(response_text)
                return parsed_json
            except json.JSONDecodeError:
                # Fallback, intentar extraer JSON con regex si falló el parseo directo
                match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
                else:
                    raise ValueError("La respuesta de Groq no contiene un JSON válido.")
                
        except ValueError as ve:
             raise HTTPException(status_code=500, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def modify_diagram(self, request: ModifyDiagramRequest) -> dict:
        current_diagram_str = json.dumps(request.current_diagram_json, ensure_ascii=False)
        system_prompt = f"""Eres un experto en modelado funcional BPMN y UML 2.5. Se te provee el JSON de un diagrama existente.
Tu ÚNICA tarea es aplicar el cambio exacto y mínimo que pide el usuario sobre este JSON y devolver el MISMO JSON con esa modificación.
REGLAS ESTRICTAS:
1. NO borres, elimines ni modifiques nodos, transiciones o lanes existentes a menos que el usuario lo pida explícitamente.
2. Aplica SOLO los cambios solicitados (ej: agregar un nodo específico, cambiar una conexión, eliminar un nodo).
3. Mantén TODOS los 'uuid' y demás atributos existentes intactos. Para elementos nuevos, genera nuevos uuid únicos.
4. Nodos ('activityNodes'): Cada uno DEBE incluir 'uuid', 'name', 'description', 'state', 'x', 'y', 'laneId', 'assigneeId', 'formSchemaJson'.
5. Formularios ('formSchemaJson'): Si el usuario pide agregar o quitar campos de formulario, grid, inputs en una actividad, haz el cambio en 'formSchemaJson'. Si no menciona formularios, déjalo exactamente como está.
6. Devuelve ÚNICAMENTE el JSON completo modificado. NO uses bloques de código ni agregues texto adicional.

JSON ACTUAL DEL DIAGRAMA:
{current_diagram_str}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model_complex,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": request.prompt
                    }
                ]
            )
            response_text = response.choices[0].message.content.strip()
            
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            return json.loads(response_text.strip())
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al modificar el diagrama con IA: {str(e)}")

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        return text.strip()

    def assistant_chat(self, request: ChatRequest) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model_fast,
                messages=[
                    {
                        "role": "system",
                        "content": f"Eres 'Flowy', asistente del Motor de Workflows. Rol del usuario: {request.user_role}. Pantalla actual: '{request.current_screen}'. Contexto: {request.screen_data}. Responde en máximo 3 oraciones, de forma directa y sin rodeos. Si necesitas listar pasos, usa máximo 4 puntos breves."
                    },
                    {
                        "role": "user",
                        "content": request.user_message
                    }
                ]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def recommend_assignee(self, request: RecommendAssigneeRequest) -> dict:
        candidates_json = json.dumps([c.model_dump() for c in request.candidates], ensure_ascii=False)
        try:
            response = self.client.chat.completions.create(
                model=self.model_fast,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": f"Eres un motor de optimización de recursos humanos. Tienes la tarea '{request.task_name}'. Evalúa a los candidatos basándote en su carga actual ('current_pending_tasks') y su eficiencia histórica ('avg_completion_hours_history'). Selecciona al candidato óptimo buscando un equilibrio para no saturar al más rápido, ni darle tareas urgentes al más lento. Devuelve ÚNICAMENTE un JSON con el 'recommended_candidate_id' y una breve 'justification'."
                    },
                    {
                        "role": "user",
                        "content": candidates_json
                    }
                ]
            )
            clean_text = self._clean_json_response(response.choices[0].message.content)
            return json.loads(clean_text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="La respuesta de Groq no es un JSON válido.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def nlp_navigate(self, request: NlpNavigateRequest) -> dict:
        available_routes = [
            '/dashboard (inicio, home, panel principal)',
            '/profile (mi perfil, cuenta, datos personales)',
            '/users (usuarios, gestión de usuarios) [solo ADMIN]',
            '/empresa (empresa, organización, configuración de empresa) [solo ADMIN]',
            '/settings (ajustes, configuración del sistema) [solo ADMIN]',
            '/policies (políticas, diseñador de políticas, plantillas) [solo DESIGNER]',
            '/designer (diseñador, editor de flujos) [solo DESIGNER]',
            '/manager/instances (instancias, flujos activos, procesos en curso) [solo MANAGER]',
            '/manager/incoming-requests (solicitudes entrantes, peticiones, bandeja de entrada del manager) [solo MANAGER]',
            '/manager/history (historial, historial de instancias, procesos completados) [solo MANAGER]',
            '/employee/inbox (tareas, bandeja de entrada, mis tareas pendientes) [solo EMPLOYEE]',
            '/employee/history (mi historial, tareas completadas, historial del empleado) [solo EMPLOYEE]',
        ]
        try:
            response = self.client.chat.completions.create(
                model=self.model_fast,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": f"Eres un enrutador NLP para una aplicación de gestión de flujos de trabajo. El usuario quiere navegar a alguna sección. Las rutas disponibles con sus palabras clave son: {available_routes}. Analiza el texto del usuario y devuelve ÚNICAMENTE un JSON válido con la ruta objetivo en el campo 'route' (solo la clave corta sin descripción, ej: '/dashboard'). Si no entiendes o no hay coincidencia clara, devuelve '/unknown'."
                    },
                    {
                        "role": "user",
                        "content": request.spoken_text
                    }
                ]
            )
            clean_text = self._clean_json_response(response.choices[0].message.content)
            return json.loads(clean_text)
        except json.JSONDecodeError:
            return {"route": "/unknown"}
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def nlp_fill_form(self, request: NlpFillFormRequest) -> dict:
        schema_json = json.dumps(request.form_schema, ensure_ascii=False)
        try:
            response = self.client.chat.completions.create(
                model=self.model_fast,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": f"Eres un extractor de entidades. Recibirás un texto dictado por un usuario y un esquema JSON de un formulario. Tu trabajo es mapear la información del texto a las claves del JSON. Si falta algún dato, déjalo como string vacío (''). Devuelve ÚNICAMENTE el JSON rellenado con los mismos campos que el esquema dado. El esquema es: {schema_json}"
                    },
                    {
                        "role": "user",
                        "content": request.spoken_text
                    }
                ]
            )
            clean_text = self._clean_json_response(response.choices[0].message.content)
            filled = json.loads(clean_text)
            return {"filled_form": filled}
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="La respuesta de Groq no es un JSON válido.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def nlp_intent(self, request: NlpIntentRequest) -> dict:
        """Classifica la intención del texto hablado: navigate | ask | generate_policy | fill_form | open_create_policy"""
        try:
            response = self.client.chat.completions.create(
                model=self.model_fast,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Eres un clasificador de intenciones (Intent Classifier) para una aplicación de flujos de trabajo (BPMN).\n"
                            "Tu única tarea es analizar el texto del usuario y clasificarlo en UNA de las siguientes intenciones. Debes devolver un JSON válido con la clave 'intent'.\n\n"
                            "Intenciones permitidas:\n"
                            "- 'navigate': Ir a otra sección de la aplicación (ej: 'llévame al dashboard').\n"
                            "- 'open_create_policy': El usuario indica que quiere CREAR una NUEVA política (ej: 'crear nueva política').\n"
                            "- 'generate_policy': El usuario pide generar un diagrama/flujo desde cero (ej: 'genera un flujo para compras').\n"
                            "- 'modify_diagram': El usuario da instrucciones para ALTERAR, EDITAR, AGREGAR, o ELIMINAR elementos del diagrama existente. INCLUYE frases como 'agrega una actividad', 'agrega un grid', 'edita las conexiones', 'conecta A con B', 'elimina el nodo'. ¡CUALQUIER comando para cambiar el diagrama pertenece aquí, NO ES UNA PREGUNTA!\n"
                            "- 'fill_form': Llenar un formulario con datos.\n"
                            "- 'ask': Solo para cuando el usuario hace una pregunta informativa general que NO implica alterar el sistema ni modificar el diagrama (ej: '¿cómo funciona esto?').\n\n"
                            "REGLA DE ORO: Si el texto dice 'agrega', 'edita', 'conecta', 'modifica', o 'elimina' algo del diagrama, la intención DEBE SER 'modify_diagram' y JAMÁS 'ask'.\n"
                            "Responde SOLO con JSON: {\"intent\": \"<valor>\"}"
                        )
                    },
                    {
                        "role": "user",
                        "content": request.spoken_text
                    }
                ]
            )
            clean_text = self._clean_json_response(response.choices[0].message.content)
            result = json.loads(clean_text)
            intent = result.get("intent", "ask")
            
            # Hardcoded fallback to guarantee modify_diagram on explicit commands
            text_lower = request.spoken_text.lower()
            mod_verbs = ["agrega ", "agregar ", "edita ", "editar ", "modifica ", "modificar ", "conecta ", "conectar ", "elimina ", "eliminar ", "cambia ", "cambiar ", "pon ", "añade ", "quita ", "añadir ", "quitar "]
            if intent == "ask" and any(verb in text_lower for verb in mod_verbs):
                intent = "modify_diagram"

            if intent not in ("navigate", "generate_policy", "fill_form", "ask", "open_create_policy", "modify_diagram"):
                intent = "ask"
            return {"intent": intent, "spoken_text": request.spoken_text}
        except json.JSONDecodeError:
            return {"intent": "ask", "spoken_text": request.spoken_text}
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def analytics_bottlenecks(self, request: AnalyticsBottlenecksRequest) -> dict:
        metrics_json = json.dumps([m.model_dump() for m in request.execution_metrics], ensure_ascii=False)
        try:
            response = self.client.chat.completions.create(
                model=self.model_complex,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": f"Actúa como un Analista de Procesos Lean Six Sigma. Analiza las métricas de ejecución del proceso '{request.policy_name}' con {request.total_instances_analyzed} instancias analizadas. Compara 'avg_duration_hours' vs 'expected_duration_hours'. Identifica el cuello de botella principal, explica por qué está afectando el flujo y sugiere 2 acciones concretas para mitigarlo. Devuelve la respuesta en un JSON estructurado con: 'bottleneck_task' (string), 'analysis' (string) y 'recommendations' (array de strings)."
                    },
                    {
                        "role": "user",
                        "content": metrics_json
                    }
                ]
            )
            clean_text = self._clean_json_response(response.choices[0].message.content)
            return json.loads(clean_text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="La respuesta de Groq no es un JSON válido.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def auto_assign_policy(self, request) -> dict:
        activities_json = json.dumps([a.model_dump() for a in request.activities], ensure_ascii=False)
        employees_json = json.dumps([e.model_dump() for e in request.employees], ensure_ascii=False)
        try:
            response = self.client.chat.completions.create(
                model=self.model_fast,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Eres un optimizador de asignacion de recursos humanos. "
                            "Recibirás actividades de una política y empleados disponibles con sus métricas. "
                            "Asigna el empleado más apto a cada actividad teniendo en cuenta:\n"
                            "- El departamento de la actividad (lane_name) vs el rol del empleado\n"
                            "- Su carga actual (current_pending_tasks): menos es mejor\n"
                            "- Su eficiencia historica (avg_completion_hours): menos es mejor\n"
                            "- Distribuye la carga equitativamente; evita saturar a un solo empleado.\n"
                            "Devuelve UNICAMENTE un JSON con la clave 'assignments', "
                            "array de objetos con: 'activity_uuid' (string), 'employee_uuid' (string), 'justification' (string breve en español)."
                        )
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Politica: {request.policy_name}\n\n"
                            f"Actividades:\n{activities_json}\n\n"
                            f"Empleados disponibles:\n{employees_json}"
                        )
                    }
                ]
            )
            clean_text = self._clean_json_response(response.choices[0].message.content)
            result = json.loads(clean_text)
            if isinstance(result, list):
                result = {"assignments": result}
            return result
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="La respuesta de Groq no es un JSON válido.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")
