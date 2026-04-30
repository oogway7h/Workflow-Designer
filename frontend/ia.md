# Especificación Técnica: Integración de Spring Boot con Microservicio de IA (FastAPI)

## 1. Contexto y Objetivo

Se requiere conectar el backend principal (Spring Boot) con el nuevo microservicio de IA (FastAPI).
Spring Boot actuará como un "Agregador/Proxy". Extraerá datos de MongoDB, los transformará en los DTOs esperados por FastAPI, realizará peticiones HTTP al microservicio y expondrá los resultados al frontend (Angular) mediante controladores REST protegidos con JWT.

## 2. Configuración Base

1. En `application.properties` o `application.yml`, agregar la URL del microservicio de IA:
   `ai.microservice.url=http://localhost:8000/api/v1/ai`
2. Configurar un `RestTemplate` o `WebClient` (o usar `RestClient` si es Spring Boot 3.2+) como un `@Bean` en una clase de configuración para realizar las llamadas HTTP.

## 3. Capa de Integración (DTOs y Clientes)

### 3.1. DTOs de Comunicación (Mapeo de FastAPI)

Crear los `Records` o clases DTO para enviar y recibir datos hacia/desde FastAPI.

- `AssistantRequestDTO` y `AssistantResponseDTO`
- `RoutingRequestDTO` (debe contener `task_name` y la lista de `candidates`) y `RoutingResponseDTO`
- `BottleneckRequestDTO` (debe contener `policy_name`, `total_instances_analyzed` y la lista de `execution_metrics`) y `BottleneckResponseDTO`.

### 3.2. Capa de Servicio (`AiIntegrationService`)

Crear un servicio anotado con `@Service` encargado exclusivamente de la comunicación HTTP con FastAPI.

- Implementar el método `getAssistantSuggestion(AssistantRequestDTO req)`
- Implementar el método `getOptimalAssignee(RoutingRequestDTO req)`
- Implementar el método `analyzeBottlenecks(BottleneckRequestDTO req)`
- _Manejo de Errores:_ Si FastAPI devuelve un error (ej. 500 o 503 por timeout de Gemini), capturar la `RestClientException` y lanzar una excepción personalizada (ej. `AiServiceUnavailableException`) para que el controlador devuelva un error amigable al frontend.

## 4. Agregación de Datos (El Músculo de Spring Boot)

Crear un servicio llamado `WorkflowAnalyticsService` encargado de consultar MongoDB y preparar la data antes de llamar a `AiIntegrationService`.

### 4.1. Lógica para Ruteo Inteligente

**Método:** `assignTaskIntelligently(UUID instanceId, String taskName, String targetLaneId)`

1. Buscar en la colección de `User` todos los empleados que pertenezcan al `targetLaneId` (ej. "Departamento Legal").
2. Consultar en MongoDB cuántas instancias en estado `ACTIVE` tiene asignadas cada candidato actualmente (`current_pending_tasks`).
3. _(Opcional/Simplificado)_ Calcular o mockear el `avg_completion_hours_history`.
4. Armar el `RoutingRequestDTO` y enviarlo a `AiIntegrationService`.
5. Recibir el `recommended_candidate_id` de la IA y actualizar la `PolicyInstance` con este ID.

### 4.2. Lógica para Cuellos de Botella

**Método:** `generatePolicyAnalytics(UUID policyId)`

1. Buscar la `Policy` para obtener los nombres de las tareas.
2. Hacer una consulta de agregación (`Aggregation` en MongoTemplate o consultas derivadas) en la colección `PolicyInstance` para todas las instancias completadas de esa política.
3. Calcular la duración promedio de cada tarea analizando las marcas de tiempo (`timestamp`) en el arreglo `history` de las instancias.
4. Construir el `BottleneckRequestDTO` y enviarlo a `AiIntegrationService`.
5. Retornar el `BottleneckResponseDTO` (Análisis y Recomendaciones) al controlador.

## 5. Exposición de Endpoints (Controladores)

Crear `AiFeatureController` para exponer las rutas a Angular:

- **`POST /api/v1/workflows/ai/chat` (Obtiene el asistente con sugerencias por contexto)**:
  - **Requisito:** JWT TÃ³ken
  - **Body Esperado:**
    ```json
    {
      "context": "Pantalla de creaciÃ³n de polÃ­ticas",
      "prompt": "Â¿QuÃ© nodos agregar?"
    }
    ```
  - **Respuesta Exitosa (200 OK):**
    ```json
    {
      "suggestion": "Te sugerimos agregar un nodo de 'ValidaciÃ³n de Nivel 1' despuÃ©s del Paso de Inicio basÃ¡ndonos en los flujos similares de tu configuraciÃ³n."
    }
    ```

- **`GET /api/v1/workflows/policies/{policyId}/analytics` (Devuelve el reporte de cuellos de botella)**:
  - **Requisito:** JWT TÃ³ken con Rol de `ADMIN` o `MANAGER`.
  - **Respuesta Exitosa (200 OK):**
    ```json
    {
      "bottlenecks": ["La revisiÃ³n de documentaciÃ³n Legal excede las 24hrs estÃ¡ndar."],
      "recommendations": ["Dividir el carril de Legal en aprobadores Junior y Senior para descongestionar correcciones bÃ¡sicas."]
    }
    ```

- _(Nota)_: El ruteo de tareas **NO** tiene endpoint propio. Este ha sido exitosamente inyectado de forma agnÃ³stica dentro del mÃ©todo `assignNextNodesAssignee()` en el `WorkflowService`. Cuando un nodo nuevo es instanciado y no viene con un encargado directo configurado (asignaciÃ³n nula), pero tiene especificado su Ã¡rea como `laneId`, el sistema llama a `assignTaskIntelligently` pasando los Empleados (roles) disponibles para que FastAPI elija el id del mÃ¡s apto de manera interna.

---

### Estado de EvaluaciÃ³n de Test Containers: Validado âœ¨

Todas las pruebas de integraciÃ³n de controladores contra mocks y bases de datos han sido confirmadas.
Security Filters (`@WithMockUser`) evitan que roles como "USER" consuman la capa analÃƒÂtica de cuellos de botella garantizando la privacidad de auditorÃƒÂa esperada mediante el manejo del `AccessDeniedException` retornando un `403 Forbidden` (`{"status": 403, "error": "Forbidden", "message": "Acceso denegado"}`).

**Resumen de Resultados (`mvnw clean test`):**

```log
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 10.85 s -- in com.primer.parcialse.presentation.controller.AiFeatureControllerTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Con esto, el Backend (Spring Boot) se encuentra listo, compilando exitosamente con 100% de Tests en Verde. Ahora procederemos con el desarrollo en Frontend (Angular) para el consumo de estos endpoints.
