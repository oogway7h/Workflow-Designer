from groq import Groq
import os
from fastapi import HTTPException
from domain.models import (
    SuggestFieldRequest, GeneratePolicyRequest, ModifyDiagramRequest,
    ChatRequest, RecommendAssigneeRequest, AnalyticsBottlenecksRequest,
    NlpNavigateRequest, NlpFillFormRequest, NlpIntentRequest, NlpCompileReportRequest,
    NlpAnalyzeDataRequest
)
import json
import re

class AIService:
    def __init__(self):
        self.client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        self.model_fast = 'llama-3.1-8b-instant'
        self.model_complex = 'llama-3.3-70b-versatile'

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
            if request.current_screen == 'DASHBOARD_ANALYTICS':
                # Pre-calcular asignaciones óptimas con DL para que el chat coincida exactamente con la auto-asignación
                optimal_assignments_text = ""
                try:
                    screen_data_dict = json.loads(request.screen_data)
                    recs = screen_data_dict.get('aiRecommendations', [])
                    if recs:
                        optimal_list = []
                        for r in recs:
                            optimal_list.append(f"Para '{r['activityName']}': recomendar a {r['employeeName']} (Tiempo est.: {round(r['estimatedHours'], 1)}h)")
                        optimal_assignments_text = "\n\nASIGNACIONES ÓPTIMAS CALCULADAS POR EL MOTOR DE IA (DEBES RECOMENDAR ESTAS EXACTAMENTE Y MOSTRAR ÚNICAMENTE LA MEJOR OPCIÓN POR ACTIVIDAD):\n" + "\n".join(optimal_list)
                    else:
                        from api.dl_router import _get_completion_predictor
                        predictor = _get_completion_predictor()
                        if predictor.is_trained():
                            activities = screen_data_dict.get('dlAnalyticsResult', [])
                            employees = screen_data_dict.get('availableEmployees', [])
                            
                            optimal_list = []
                            simulated_load = {emp["id"]: 0 for emp in employees}
                            seen_tasks = set()
                            for act in activities:
                                task_name = act.get('task_name') or act.get('task_id', '')
                                if not task_name or task_name in seen_tasks: continue
                                seen_tasks.add(task_name)
                                
                                # Filtrar candidatos: deben pertenecer al mismo departamento (lane_id / department_id)
                                task_dept = act.get('department_id')
                                cands = []
                                for e in employees:
                                    emp_dept = e.get('departmentId') or e.get('department_id')
                                    if task_dept and emp_dept and task_dept != emp_dept:
                                        continue
                                    cands.append({
                                        "employee_id": e["id"],
                                        "pending_tasks": simulated_load.get(e["id"], 0)
                                    })
                                
                                if not cands:
                                    cands = [{"employee_id": e["id"], "pending_tasks": simulated_load.get(e["id"], 0)} for e in employees]
                                    
                                if not cands: continue
                                    
                                best_result = predictor.find_best_assignee("default_policy", task_name, cands)
                                best_id = best_result["best_employee_id"]
                                best_emp = next((e for e in employees if e["id"] == best_id), None)
                                if best_emp:
                                    simulated_load[best_id] += 1
                                    optimal_list.append(f"Para '{task_name}': recomendar a {best_emp['name']} (Tiempo est.: {round(best_result['estimated_hours'], 1)}h)")
                            
                            if optimal_list:
                                optimal_assignments_text = "\n\nASIGNACIONES ÓPTIMAS CALCULADAS POR DEEP LEARNING (USA ESTAS EXACTAMENTE):\n" + "\n".join(optimal_list)
                except Exception as e:
                    pass

                system_prompt = (
                    f"Eres 'Flowy', un asistente corporativo directo y profesional. Rol: {request.user_role}. "
                    f"Pantalla: '{request.current_screen}'. Contexto: {request.screen_data}. "
                    "REGLAS CRÍTICAS Y ESTRICTAS PARA TU RESPUESTA:\n"
                    "1. NO expliques tu proceso mental (ej. 'Buscaré en el contexto...', 'Al revisar el JSON...').\n"
                    "2. NO imprimas ni muestres bloques de código JSON ni arrays.\n"
                    "3. NO menciones los UUIDs.\n"
                    "4. Usa el nombre real de la política indicado en 'selectedPolicyName'.\n"
                    f"5. Debes RECOMENDAR EXCLUSIVAMENTE y DE FORMA EXACTA el funcionario indicado por el modelo de IA Predictiva en la sección ASIGNACIONES ÓPTIMAS: {optimal_assignments_text}\n"
                    "6. IGNORA COMPLETAMENTE la lista de 'availableEmployees' y sus puntuaciones de porcentaje (como 87%, 96%, 99%). NO uses ni muestres esos porcentajes para recomendar.\n"
                    "7. Muestra ÚNICAMENTE la mejor opción para cada actividad (un solo funcionario por actividad). NUNCA listes múltiples funcionarios para una actividad, ni segundas opciones, ni subviñetas.\n"
                    "8. Formato obligatorio por cada actividad (usa exactamente este formato):\n"
                    "   - **[Nombre de la Actividad]**: [Nombre del Funcionario] (Rendimiento/Estimado: [valor de tiempo estimado en horas, ej: 4.5h])\n"
                    "9. Escribe solo una breve introducción amable en español y luego directamente la lista de asignaciones. Sé extremadamente conciso y directo."
                )
            else:
                system_prompt = (
                    f"Eres 'Flowy', asistente del Motor de Workflows. Rol del usuario: {request.user_role}. "
                    f"Pantalla actual: '{request.current_screen}'. Contexto: {request.screen_data}. "
                    "Si el usuario pregunta por un trámite, desea iniciar un proceso o pide información sobre qué necesita, "
                    "identifica el trámite adecuado de la lista provista en el contexto, explícale de forma clara el flujo y "
                    "detalla qué documentos específicos (obligatorios y opcionales) deberá subir. "
                    "Responde en máximo 4 oraciones de forma directa. Si necesitas listar los documentos, usa viñetas muy breves."
                )
            response = self.client.chat.completions.create(
                model=self.model_fast,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
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
            '/documents (documentos, archivos, gestor documental, dms, subir archivos, ver archivos)',
            '/reports (reportes, kpis, estadísticas, informes, reportes e ia, graficos)',
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
        """Classifica la intención del texto hablado: navigate | ask | generate_policy | fill_form | open_create_policy | compile_report"""
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
                            "- 'open_create_policy': El usuario indica que quiere CREAR una NUEVA política VACÍA usando el formulario (ej: 'crear nueva política', 'nueva política').\n"
                            "- 'generate_policy': El usuario describe un trámite, proceso o flujo de trabajo y quiere que la IA lo GENERE AUTOMÁTICAMENTE como diagrama. INCLUYE frases como 'crea un trámite de...', 'genera un flujo para...', 'crea un proceso de...', 'diseña un flujo que...', 'hazme un trámite para...', 'quiero un flujo de...', y también comandos cortos que implican crear/generar algo ya descrito como 'créalo', 'hazlo', 'genéralo', 'sí créalo'. ¡Si el usuario describe PASOS de un proceso, la intención ES generate_policy!\n"
                            "- 'modify_diagram': El usuario da instrucciones para ALTERAR, EDITAR, AGREGAR, o ELIMINAR elementos del diagrama existente. INCLUYE frases como 'agrega una actividad', 'agrega un grid', 'edita las conexiones', 'conecta A con B', 'elimina el nodo'. ¡CUALQUIER comando para cambiar el diagrama pertenece aquí, NO ES UNA PREGUNTA!\n"
                            "- 'fill_form': Llenar un formulario con datos.\n"
                            "- 'compile_report': El usuario solicita generar, descargar, ver, consultar o crear un reporte o informe estadístico, gráficos de reporte o KPIs en lenguaje natural (ej: 'quiero un reporte...', 'genera un reporte de...', 'saca un informe con...', 'muéstrame un gráfico de...').\n"
                            "- 'ask': Solo para cuando el usuario hace una pregunta informativa general que NO implica alterar el sistema, modificar el diagrama, NI crear/generar un trámite o flujo (ej: '¿cómo funciona esto?').\n\n"
                            "REGLAS DE ORO:\n"
                            "1. Si el texto dice 'agrega', 'edita', 'conecta', 'modifica', o 'elimina' algo del diagrama, la intención DEBE SER 'modify_diagram' y JAMÁS 'ask'.\n"
                            "2. Si el texto dice 'crea un trámite', 'crea un flujo', 'crea un proceso', 'genera un flujo', 'hazme un proceso', 'diseña un trámite' o describe pasos de un proceso, la intención DEBE SER 'generate_policy' y JAMÁS 'ask'.\n"
                            "3. 'créalo', 'hazlo', 'genéralo', 'sí, créalo' = 'generate_policy'.\n"
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
            
            text_lower = request.spoken_text.lower().strip()

            # Hardcoded fallback to guarantee generate_policy on creation commands
            gen_phrases = [
                "crea un tramite", "crea un trámite", "crea un flujo", "crea un proceso",
                "genera un tramite", "genera un trámite", "genera un flujo", "genera un proceso",
                "diseña un flujo", "diseña un tramite", "diseña un trámite", "diseña un proceso",
                "hazme un flujo", "hazme un tramite", "hazme un trámite", "hazme un proceso",
                "quiero un flujo", "quiero un tramite", "quiero un trámite", "quiero un proceso",
                "crea el tramite", "crea el trámite", "crea el flujo", "crea el proceso",
                "genera el diagrama", "genera el tramite", "genera el trámite",
            ]
            # Short confirmation commands that mean "yes, generate it"
            gen_confirmations = [
                "crealo", "créalo", "hazlo", "generalo", "genéralo",
                "si crealo", "sí créalo", "si hazlo", "sí hazlo",
                "si generalo", "sí genéralo", "dale", "procede",
            ]
            
            if intent in ("ask", "modify_diagram") and any(phrase in text_lower for phrase in gen_phrases):
                intent = "generate_policy"
            
            if intent in ("ask", "modify_diagram") and text_lower in gen_confirmations:
                intent = "generate_policy"

            # Hardcoded fallback to guarantee modify_diagram on explicit commands
            mod_verbs = ["agrega ", "agregar ", "edita ", "editar ", "modifica ", "modificar ", "conecta ", "conectar ", "elimina ", "eliminar ", "cambia ", "cambiar ", "pon ", "añade ", "quita ", "añadir ", "quitar "]
            if intent == "ask" and any(verb in text_lower for verb in mod_verbs):
                intent = "modify_diagram"

            # Hardcoded fallback to guarantee compile_report on report requests
            report_keywords = ["reporte", "informe", "kpi", "gráfico", "grafico", "kpis"]
            if (intent in ("ask", "navigate")) and any(kw in text_lower for kw in report_keywords):
                intent = "compile_report"

            if intent not in ("navigate", "generate_policy", "fill_form", "ask", "open_create_policy", "modify_diagram", "compile_report"):
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
        try:
            from api.dl_router import _get_completion_predictor
            predictor = _get_completion_predictor()
            
            if predictor.is_trained():
                assignments = []
                # Copiar empleados para simular carga
                employees = {emp.uuid: emp.current_pending_tasks for emp in request.employees}
                
                for activity in request.activities:
                    candidates = []
                    for emp in request.employees:
                        # Filtrar candidatos: deben pertenecer al mismo departamento (lane_id) de la actividad
                        if activity.lane_id and emp.department_id and emp.department_id != activity.lane_id:
                            continue
                        candidates.append({
                            "employee_id": emp.uuid,
                            "pending_tasks": employees[emp.uuid]
                        })
                    
                    if not candidates:
                        # Fallback si no hay nadie del departamento
                        for emp in request.employees:
                            candidates.append({
                                "employee_id": emp.uuid,
                                "pending_tasks": employees[emp.uuid]
                            })
                    
                    # Predice el mejor funcionario para esta actividad
                    best_result = predictor.find_best_assignee(
                        policy_id="default_policy", 
                        activity_id=activity.uuid, 
                        candidates=candidates
                    )
                    best_employee_id = best_result["best_employee_id"]
                    
                    # Actualiza la carga para las siguientes iteraciones
                    employees[best_employee_id] += 1
                    
                    assignments.append({
                        "activity_uuid": activity.uuid,
                        "employee_uuid": best_employee_id,
                        "justification": f"Asignado óptimamente por modelo de Deep Learning (estimado: {round(best_result['estimated_hours'], 1)}h)."
                    })
                    
                return {"assignments": assignments}
        except Exception as e:
            pass # Fallback to LLM

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
                            "Eres un optimizador de asignacion de recursos humanos.\n"
                            "Recibirás actividades de una política y empleados disponibles.\n"
                            "Asigna el empleado más apto a cada actividad teniendo en cuenta:\n"
                            "- Asigna ÚNICAMENTE a un empleado que pertenezca al departamento de la actividad (el department_id del empleado debe coincidir exactamente con el lane_id de la actividad).\n"
                            "- Considera su carga actual (current_pending_tasks): menos es mejor.\n"
                            "- Considera su eficiencia histórica (avg_completion_hours): menos es mejor.\n"
                            "- Distribuye la carga equitativamente si hay múltiples empleados en el mismo departamento.\n"
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

    def compile_report(self, request: NlpCompileReportRequest) -> dict:
        prompt_lower = request.prompt.lower()

        system_prompt = """Eres un experto analista de datos de MongoDB. Convierte instrucciones en lenguaje natural (español) en especificaciones JSON para consultas de agregación MongoDB.

COLECCIONES DISPONIBLES:
1. `policy_instances`: id, uuid, policyId (ref→policies.uuid), applicantId, managerId, status ("ACTIVE"|"COMPLETED"|"CANCELLED"), currentAssigneeId, currentAssigneeRole, instanceData (object), history (array: activityNodeId, assigneeId, action, timestamp, formDataAtStep), createdAt (Date BSON), updatedAt (Date BSON).
2. `policies`: id, uuid, name, description, managerId, ownerId, lanes (array: _id, name ej: "Empleado","Recursos Humanos","Legal"), activityNodes (array: uuid, name, type, laneId).
3. `users`: id, uuid, name, lastname, email, role, departmentId.
4. `departments`: id, uuid, name.

FORMATO DE RESPUESTA (JSON estricto, sin bloques markdown):
{
  "title": "Título del reporte",
  "description": "Breve descripción del objetivo",
  "collection": "policy_instances",
  "pipeline": [ /* etapas: $match, $group, $project, $sort, $limit, $lookup, $unwind, $addFields */ ],
  "columns": [ {"key": "campo_resultado", "label": "Etiqueta Español"} ],
  "kpis": [ {"title": "Nombre", "value_key": "campo", "format": "number"} ],
  "chart": {"type": "bar|pie", "x_key": "campo_categoría", "y_key": "campo_numérico"}
}

REGLAS CRÍTICAS:
1. createdAt y updatedAt SON Date BSON nativos. Para duración usa: {"$divide": [{"$subtract": ["$updatedAt", "$createdAt"]}, 3600000]}. NUNCA uses $dateFromString.
2. Para filtrar por política: $lookup a "policies" (localField:"policyId", foreignField:"uuid", as:"policy_info"), $unwind, y $match con $regex de subcadena SIN anclas ^ ni $ (ej: {"policy_info.name": {"$regex": "presupuesto", "$options": "i"}}).
3. Para filtrar por departamento: $lookup a "policies" y filtrar "policy_info.lanes.name" con $regex, O $lookup a "users" + "departments" y filtrar "dept_info.name".
4. Después de $group, los campos agrupados están en "_id". Proyéctalos desde "$_id" (si _id es string) o "$_id.campo" (si _id es objeto), NUNCA desde la raíz del documento.
5. NO filtres por status ("COMPLETED"/"ACTIVE") a menos que el usuario lo pida explícitamente con palabras como "completados", "activos", "finalizados".
6. "chart" es OBLIGATORIO solo si el usuario pide gráfico (barras/pastel/pie/patel). "y_key" DEBE ser numérico.
7. Para duración de ACTIVIDADES individuales: $unwind "$history", $group por {policyId, activityNodeId}, calcular avgDurationHours con $avg, luego $lookup policies para obtener nombre de actividad con $let/$filter sobre activityNodes.
8. Para nombre de funcionarios: $lookup a "users" (localField:"assigneeId" o "currentAssigneeId", foreignField:"uuid", as:"assignee_info"), $unwind preservando nulos, y concatenar name+lastname.
9. Para departamento del funcionario: después del lookup de users, $lookup a "departments" (localField:"assignee_info.departmentId", foreignField:"uuid", as:"assignee_dept"), $unwind preservando nulos.
10. NO incluyas campos técnicos como "uuid" o "id" en el reporte a menos que el usuario lo pida explícitamente. Usa siempre nombres legibles (ej. policyName, activityName).

EJEMPLOS DE REFERENCIA:

Prompt: "Muestra el porcentaje de solicitudes completadas vs activas en un gráfico de pastel"
{"title":"Distribución por Estado","description":"Porcentaje de instancias por estado","collection":"policy_instances","pipeline":[{"$group":{"_id":"$status","count":{"$sum":1}}},{"$project":{"_id":0,"status":"$_id","count":"$count"}}],"columns":[{"key":"status","label":"Estado"},{"key":"count","label":"Cantidad"}],"kpis":[{"title":"Total","value_key":"count","format":"number"}],"chart":{"type":"pie","x_key":"status","y_key":"count"}}

Prompt: "Muestra las instancias del departamento legal que más tardaron, top 3 en gráfico pastel"
{"title":"Top 3 Instancias Más Lentas - Legal","description":"Instancias con mayor duración del depto Legal","collection":"policy_instances","pipeline":[{"$lookup":{"from":"policies","localField":"policyId","foreignField":"uuid","as":"policy_info"}},{"$unwind":"$policy_info"},{"$match":{"policy_info.lanes.name":{"$regex":"legal","$options":"i"}}},{"$addFields":{"durationHours":{"$divide":[{"$subtract":["$updatedAt","$createdAt"]},3600000]}}},{"$project":{"_id":0,"policyName":"$policy_info.name","durationHours":{"$round":["$durationHours",1]}}},{"$sort":{"durationHours":-1}},{"$limit":3}],"columns":[{"key":"policyName","label":"Política"},{"key":"durationHours","label":"Duración (Horas)"}],"kpis":[{"title":"Instancias","value_key":"count","format":"number"}],"chart":{"type":"pie","x_key":"policyName","y_key":"durationHours"}}

Prompt: "Top 10 actividades que más tardan con nombre de funcionarios y departamento"
{"title":"Top 10 Actividades Más Lentas","description":"Actividades con mayor duración promedio","collection":"policy_instances","pipeline":[{"$match":{"history.0":{"$exists":true}}},{"$unwind":"$history"},{"$group":{"_id":{"policyId":"$policyId","activityNodeId":"$history.activityNodeId"},"avgDurationHours":{"$avg":{"$divide":[{"$subtract":["$history.timestamp","$createdAt"]},3600000]}},"assigneeId":{"$first":"$history.assigneeId"}}},{"$lookup":{"from":"policies","localField":"_id.policyId","foreignField":"uuid","as":"policy_info"}},{"$unwind":"$policy_info"},{"$lookup":{"from":"users","localField":"assigneeId","foreignField":"uuid","as":"assignee_info"}},{"$unwind":{"path":"$assignee_info","preserveNullAndEmptyArrays":true}},{"$lookup":{"from":"departments","localField":"assignee_info.departmentId","foreignField":"uuid","as":"assignee_dept"}},{"$unwind":{"path":"$assignee_dept","preserveNullAndEmptyArrays":true}},{"$project":{"_id":0,"policyName":"$policy_info.name","activityName":{"$let":{"vars":{"matchedNode":{"$filter":{"input":"$policy_info.activityNodes","as":"n","cond":{"$eq":["$$n.uuid","$_id.activityNodeId"]}}}},"in":{"$arrayElemAt":["$$matchedNode.name",0]}}},"avgDurationHours":{"$round":["$avgDurationHours",1]},"funcionario":{"$concat":["$assignee_info.name"," ","$assignee_info.lastname"]},"departamento":"$assignee_dept.name"}},{"$sort":{"avgDurationHours":-1}},{"$limit":10}],"columns":[{"key":"policyName","label":"Política"},{"key":"activityName","label":"Actividad"},{"key":"avgDurationHours","label":"Duración Promedio (Horas)"},{"key":"funcionario","label":"Funcionario"},{"key":"departamento","label":"Departamento"}],"kpis":[{"title":"Actividades","value_key":"count","format":"number"}],"chart":null}

Devuelve ÚNICAMENTE el JSON."""

        try:
            user_content = request.prompt
            if hasattr(request, 'error_context') and request.error_context:
                user_content += f"\n\n[ERROR EN PIPELINE ANTERIOR: {request.error_context}. Corrige el pipeline para evitar este error.]"

            clean_text = None
            try:
                print("Calling Groq complex model for compile_report...")
                response = self.client.chat.completions.create(
                    model=self.model_complex,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ]
                )
                clean_text = self._clean_json_response(response.choices[0].message.content)
            except Exception as e_complex:
                print(f"WARNING: Groq complex model compile_report failed: {str(e_complex)}. Falling back to fast model.")
                try:
                    response = self.client.chat.completions.create(
                        model=self.model_fast,
                        response_format={"type": "json_object"},
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content}
                        ]
                    )
                    clean_text = self._clean_json_response(response.choices[0].message.content)
                except Exception as e_fast:
                    err_msg = str(e_fast)
                    print(f"WARNING: Groq fast model JSON validation call failed: {err_msg}")
                    failed_gen = None
                    if hasattr(e_fast, "body") and isinstance(e_fast.body, dict) and "error" in e_fast.body:
                        failed_gen = e_fast.body["error"].get("failed_generation")
                    if failed_gen:
                        print("Retrieved failed generation from Groq error body. Applying typo fixes.")
                        clean_text = self._clean_json_response(failed_gen)
                    else:
                        print("Retrying fast model without response_format constraints.")
                        response = self.client.chat.completions.create(
                            model=self.model_fast,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_content}
                            ]
                        )
                        clean_text = self._clean_json_response(response.choices[0].message.content)

            print("--- RAW TEXT FROM GROQ ---")
            print(clean_text)
            clean_text = self._fix_json_typos(clean_text)
            print("--- FIXED TEXT ---")
            print(clean_text)

            try:
                result = json.loads(clean_text)
            except json.JSONDecodeError as decode_err:
                print(f"JSONDecodeError: {str(decode_err)}. Trying to fix manually.")
                clean_text = self._fix_json_typos(clean_text)
                result = json.loads(clean_text)

            # Pipeline cleanup and sanitization
            if "pipeline" in result and isinstance(result["pipeline"], list):
                new_pipeline = []
                for stage in result["pipeline"]:
                    if isinstance(stage, dict):
                        if "$lookup" in stage:
                            lookup = stage["$lookup"]
                            if lookup.get("from") == "policies.activityNodes":
                                lookup["from"] = "policies"

                        if "$match" in stage:
                            match_stage = stage["$match"]
                            for key in list(match_stage.keys()):
                                if key in ("departmentName", "department", "departamento", "dept", "lane", "laneName"):
                                    match_stage.pop(key)

                            if "status" in match_stage:
                                val = match_stage["status"]
                                is_status_filter = False
                                if isinstance(val, str) and val in ("COMPLETED", "ACTIVE"):
                                    is_status_filter = True
                                elif isinstance(val, dict):
                                    for k, v in val.items():
                                        if isinstance(v, str) and v in ("COMPLETED", "ACTIVE"):
                                            is_status_filter = True
                                        elif isinstance(v, list) and any(item in ("COMPLETED", "ACTIVE") for item in v):
                                            is_status_filter = True
                                if is_status_filter:
                                    status_kw = ["completad", "finaliz", "terminad", "activ", "cancelad"]
                                    if not any(w in prompt_lower for w in status_kw):
                                        match_stage.pop("status")

                            if not match_stage:
                                continue
                    new_pipeline.append(stage)

                result["pipeline"] = self._sanitize_pipeline(new_pipeline)

            self._process_regex_recursive(result)

            chart_keywords = ["grafic", "gráfi", "barra", "pastel", "patel", "pie", "chart", "plot", "dibuj", "visualiz"]
            has_chart_intent = any(k in prompt_lower for k in chart_keywords)
            if not has_chart_intent and "chart" in result:
                result.pop("chart", None)

            result = self._auto_correct_sort(result, request.prompt)
            return result
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="La respuesta del LLM no es un JSON válido después de corregirla.")
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con la API de Groq: {str(e)}")

    def _sanitize_pipeline(self, pipeline: list) -> list:
        valid_stages = {
            "$match", "$group", "$project", "$sort", "$limit", 
            "$lookup", "$unwind", "$addFields", "$skip", "$count", "$facet"
        }
        sanitized = []
        for stage in pipeline:
            if isinstance(stage, dict):
                # Filter out unsupported operations
                clean_stage = {k: v for k, v in stage.items() if k in valid_stages}
                if clean_stage:
                    sanitized.append(clean_stage)
        return sanitized

    def _auto_correct_sort(self, result: dict, prompt: str) -> dict:
        if "pipeline" not in result or not isinstance(result["pipeline"], list):
            return result
            
        pipeline = result["pipeline"]
        prompt_lower = prompt.lower()
        
        desc_keywords = [
            "mas tardaron", "más tardaron", "tardaron más", "tardaron mas", "que mas tardan", "que más tardan",
            "mayor duracion", "mayor duración", "duración más", "duracion mas", "más larga", "mas larga",
            "más lenta", "mas lenta", "más lentas", "mas lentas", "más lentos", "mas lentos",
            "cuello de botella", "cuellos de botella"
        ]
        asc_keywords = [
            "menos tardaron", "menos se tardan", "menos tardan", "más rápida", "mas rapida",
            "más rápidas", "mas rapidas", "menor duracion", "menor duración", "más corta", "mas corta",
            "más rápido", "mas rapido", "más rápidos", "mas rapidos"
        ]
        
        should_be_desc = any(k in prompt_lower for k in desc_keywords)
        should_be_asc = any(k in prompt_lower for k in asc_keywords)
        
        if should_be_desc or should_be_asc:
            for stage in pipeline:
                if isinstance(stage, dict) and "$sort" in stage and isinstance(stage["$sort"], dict):
                    sort_dict = stage["$sort"]
                    for key in list(sort_dict.keys()):
                        # Look for duration keys or value keys
                        if any(x in key.lower() for x in ["duration", "hours", "avg", "time", "tard"]):
                            if should_be_desc:
                                sort_dict[key] = -1
                            elif should_be_asc:
                                sort_dict[key] = 1
                                
        return result

    def _make_accent_insensitive(self, pattern: str) -> str:
        mapping = {
            'a': '[aáAÁ]', 'á': '[aáAÁ]',
            'e': '[eéEÉ]', 'é': '[eéEÉ]',
            'i': '[iíIÍ]', 'í': '[iíIÍ]',
            'o': '[oóOÓ]', 'ó': '[oóOÓ]',
            'u': '[uúüUÚÜ]', 'ú': '[uúüUÚÜ]', 'ü': '[uúüUÚÜ]',
            'n': '[nñNÑ]', 'ñ': '[nñNÑ]'
        }
        res = []
        for c in pattern:
            c_low = c.lower()
            if c_low in mapping:
                res.append(mapping[c_low])
            else:
                res.append(c)
        return "".join(res)

    def _process_regex_recursive(self, obj):
        if isinstance(obj, dict):
            # Auto-correct options and regex keys
            if "options" in obj and ("$regex" in obj or "regex" in obj):
                obj["$options"] = obj.pop("options")
            if "regex" in obj:
                obj["$regex"] = obj.pop("regex")
                
            # Double check for lowercase options alongside $regex
            for k in list(obj.keys()):
                if k == "options" and ("$regex" in obj or "regex" in obj):
                    obj["$options"] = obj.pop("options")
            
            if "$regex" in obj and isinstance(obj["$regex"], str):
                obj["$regex"] = self._make_accent_insensitive(obj["$regex"])
            
            for key, val in list(obj.items()):
                self._process_regex_recursive(val)
        elif isinstance(obj, list):
            for item in obj:
                self._process_regex_recursive(item)

    def _fix_json_typos(self, text: str) -> str:
        # 1. Remove unnecessary and invalid $dateFromString wrappers on BSON Dates
        date_pattern = re.compile(
            r'\{\s*"\$dateFromString"\s*:\s*\{\s*"dateString"\s*:\s*("\$.*?")\s*\}\s*\}',
            re.DOTALL
        )
        text = date_pattern.sub(r'\1', text)
        
        # 2. Fix invalid "$divide": { "$subtract": [ ... ], 3600000 } syntax
        pattern = re.compile(
            r'"\$divide"\s*:\s*\{\s*"\$subtract"\s*:\s*(\[.*?\])\s*,\s*(\d+)\s*\}', 
            re.DOTALL
        )
        text = pattern.sub(r'"$divide": [ { "$subtract": \1 }, \2 ]', text)
        return text

    def analyze_report_data(self, request: NlpAnalyzeDataRequest) -> dict:
        try:
            data_str = json.dumps(request.data, ensure_ascii=False, indent=2)
            system_prompt = (
                "Analiza los siguientes datos de ejecución de workflows de la empresa y responde a la pregunta del usuario. "
                "Redacta un informe ejecutivo claro, detallado y profesional en español de 2 párrafos explicando "
                "los resultados, posibles cuellos de botella (o estado general) y sugiriendo mejoras concretas. "
                "Tu respuesta será inyectada en un PDF, por lo que debe ser redactada en tono formal y directo sin usar caracteres especiales como asteriscos."
            )
            user_content = f"Pregunta del usuario: '{request.prompt}'\n\nDatos recuperados:\n{data_str}"
            
            try:
                response = self.client.chat.completions.create(
                    model=self.model_complex,
                    messages=[
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": user_content
                        }
                    ]
                )
            except Exception as inner_e:
                print(f"WARNING: complex model failed due to rate limits or error ({str(inner_e)}). Falling back to fast model.")
                response = self.client.chat.completions.create(
                    model=self.model_fast,
                    messages=[
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": user_content
                        }
                    ]
                )
            
            analysis_text = response.choices[0].message.content.strip()
            return {"analysis": analysis_text}
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Error al comunicarse con Deep Learning Engine para análisis: {str(e)}")
