# Arquitectura del Proyecto — Workflow Designer

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Estructura de Directorios](#estructura-de-directorios)
4. [Editor de Políticas (Canvas)](#editor-de-políticas-canvas)
5. [Interceptor JWT](#interceptor-jwt)
6. [WebSocket Colaborativo](#websocket-colaborativo)
7. [Captura del Movimiento del Mouse](#captura-del-movimiento-del-mouse)
8. [IA en el Proyecto](#ia-en-el-proyecto)
9. [Infraestructura y Despliegue](#infraestructura-y-despliegue)

---

## Visión General

El proyecto **Workflow Designer** es una aplicación web para diseñar y ejecutar flujos de trabajo empresariales. Permite a equipos crear diagramas de actividades UML (políticas) con colaboración en tiempo real, asistencia por IA y control de acceso por roles.

**Stack tecnológico:**

| Capa            | Tecnología                                     |
| --------------- | ---------------------------------------------- |
| Frontend        | Angular 17 (standalone), Tailwind CSS, RxStomp |
| Backend         | Spring Boot 3.2.5, Java 21, MongoDB Atlas      |
| IA              | FastAPI, Python 3.12, Groq API (LLaMA)         |
| Base de datos   | MongoDB Atlas (cloud)                          |
| Infraestructura | Docker, Docker Compose, Nginx, AWS EC2         |

---

## Arquitectura del Sistema

### Clean Architecture (Backend)

El backend implementa **Clean Architecture** con cuatro capas claramente separadas:

```
presentation/     ← Controllers HTTP (REST) y WebSocket
    ↓
application/      ← Casos de uso, DTOs, servicios de aplicación
    ↓
domain/           ← Entidades, interfaces de repositorio (contratos)
    ↓
infrastructure/   ← Repositorios MongoDB, clientes externos, configuración
```

**Principio clave:** las capas internas no dependen de las externas. El dominio no conoce Spring, MongoDB ni HTTP.

### Arquitectura de microservicios (simplificada)

```
[Cliente navegador]
        │
        ▼
   [Nginx :80]
  /api/v1 → proxy → [Backend Spring Boot :8080]
  /ws     → proxy → [Backend WebSocket]
        │
        ├── HTTP REST → [ia_service FastAPI :8000]
        │
        └── MongoDB Atlas (cloud)
```

El frontend, backend e ia_service corren en la misma VPS dentro de una red Docker (`app-network`). Solo Nginx expone el puerto 80 al exterior.

---

## Estructura de Directorios

### Frontend (`frontend/`)

```
src/
  app/
    core/                    # Singleton services, guards, interceptors, models
      config/
        menu.config.ts       # Menú lateral por rol
      guards/
        auth.guard.ts        # Redirige si no hay sesión
        role.guard.ts        # Redirige si el rol no tiene acceso
      interceptors/
        api.interceptor.ts   # Agrega JWT a todas las requests HTTP
      models/                # Interfaces TypeScript (User, Policy, Department, etc.)
      services/
        auth.service.ts      # Login, registro, usuario actual (Signal)
        websocket.service.ts # Cliente STOMP singleton (RxStomp)
        department.service.ts
        policy.service.ts
        ai-chat.service.ts   # Chat con la IA
        nlp.service.ts       # NLP routing y fill-form
        ...
    features/                # Módulos de funcionalidad por dominio
      auth/                  # Login y registro
      dashboard/             # Panel de métricas
      designer/              # Vista del diseñador (wrapper)
      policy-designer/       # *** Editor de canvas UML principal ***
      admin/                 # Gestión de usuarios y departamentos
      manager/               # Vista del gestor
      employee/              # Bandeja de tareas del empleado
      task-inbox/            # Inbox de tareas pendientes
      users/                 # Gestión de usuarios
    layout/
      shell/                 # Layout principal con sidebar y topbar
    shared/
      components/            # Componentes reutilizables (loader, toast, confirm)
      services/              # ToastService, ConfirmService, VoiceContextService
      ui/                    # Primitivas UI compartidas
  environments/
    environment.ts           # Dev: apiUrl = 'http://localhost:8080/api/v1'
    environment.prod.ts      # Prod: apiUrl = '/api/v1' (relativo, nginx proxy)
```

### Backend (`backend/src/main/java/com/primer/parcialse/`)

```
domain/
  entities/          # Entidades del dominio (Policy, User, Department, Task...)
  repositories/      # Interfaces de repositorio (contratos puros)
  events/            # Domain events (si aplica)

application/
  dto/               # DTOs de entrada y salida (Request/Response)
    ai/              # DTOs específicos de IA (GeneratePolicyRequestDTO, etc.)
  services/          # Casos de uso (PolicyService, UserService, AiIntegrationService...)
  mappers/           # Conversión entidad ↔ DTO

infrastructure/
  persistence/       # Implementaciones MongoDB de los repositorios
  config/            # Spring Security, CORS, WebSocket config
  external/          # Clientes HTTP a servicios externos (ia_service)

presentation/
  controller/        # REST Controllers (@RestController)
    AiFeatureController.java   # Endpoints de generación IA y chat
    PolicyController.java
    UserController.java
    ...
  websocket/         # STOMP handlers (@MessageMapping)
```

### ia_service (`ia_service/`)

```
main.py              # Entry point FastAPI + uvicorn
api/
  routes.py          # Registro de routers
  nlp_router.py      # Rutas NLP (/navigate, /fill-form)
application/
  ai_service.py      # *** Toda la lógica IA (prompts, modelos, Groq) ***
domain/
  models.py          # Pydantic models (schemas de request/response)
infrastructure/
  groq_client.py     # Cliente Groq API (singleton)
```

---

## Editor de Políticas (Canvas)

**Archivo:** `frontend/src/app/features/policy-designer/policy-designer.component.ts`

El componente es un editor de diagramas de actividades UML interactivo construido completamente en Angular sin librerías de diagramas externas.

### Estructura del Canvas

El canvas es un `<div>` con `overflow-auto` sobre el que se superponen tres capas:

1. **Swim Lanes** (`z-index: 0`): divisiones verticales que representan departamentos. Cada lane tiene un encabezado pegajoso con el nombre del departamento.
2. **SVG Layer** (`z-index: 1`): renderiza todas las flechas de transición como curvas Bézier cúbicas.
3. **Nodos** (`z-index: 2`): elementos HTML arrastables con `CdkDrag`.

### Tipos de Nodos

| Tipo       | Representación visual          | SVG/HTML                    |
| ---------- | ------------------------------ | --------------------------- |
| `INITIAL`  | Círculo negro relleno          | `<circle>` SVG              |
| `FINAL`    | Círculo con punto interior     | Dos `<circle>` concéntricos |
| `ACTIVITY` | Rectángulo redondeado amarillo | `<div>` con Tailwind        |
| `APPROVAL` | Rectángulo redondeado azul     | `<div>` con borde azul      |
| `DECISION` | Rombo amarillo                 | `<polygon>` SVG             |
| `FORK`     | Barra negra horizontal gruesa  | `<rect>` SVG                |

### Movimiento de Nodos (CdkDrag)

Los nodos usan `@angular/cdk/drag-drop`:

```html
<div
  cdkDrag
  [cdkDragFreeDragPosition]="{ x: node.x, y: node.y }"
  (cdkDragEnded)="onNodeDragEnd($event, node)"
  (cdkDragMoved)="onNodeDragMoved($event, node)"
></div>
```

- `cdkDragFreeDragPosition`: posiciona el nodo en las coordenadas absolutas almacenadas en el modelo.
- `(cdkDragMoved)`: actualiza las coordenadas del nodo en tiempo real mientras se arrastra → el SVG de flechas se recalcula automáticamente gracias al `computed()` de Angular Signals.
- `(cdkDragEnded)`: consolida la posición final en el modelo de datos.

### Conexiones (Flechas SVG)

Las transiciones se calculan con el `computed` signal `connectionLines()`:

1. Para cada transición, se buscan los nodos origen y destino.
2. Se calculan los **puntos de anclaje** (top/bottom/left/right) de cada nodo con `anchorPoints()`.
3. La función `bestAnchors()` elige automáticamente el par de anclajes que minimiza el cruce de líneas según la dirección relativa entre nodos.
4. Se genera un **path SVG de curva Bézier cúbica**: `M x1,y1 C cp1x,cp1y cp2x,cp2y x2,y2`.
5. Al seleccionar una flecha, aparece un **punto de control arrastrable** (círculo índigo en el punto medio) para curvar la línea manualmente.
6. Los puntos de anclaje del nodo origen (índigo) y destino (esmeralda) aparecen como círculos clicables para cambiar el punto de salida/entrada de la flecha.

### Diseñador de Formularios

Cada nodo de tipo `ACTIVITY` o `APPROVAL` puede tener un esquema de formulario. El modal **"Crear formulario"** permite definir campos con nombre, tipo (`string`, `number`, `boolean`, `date`, `text`) y si son obligatorios. El schema se serializa como `formSchemaJson` y se guarda dentro del nodo en MongoDB.

---

## Interceptor JWT

**Archivo:** `frontend/src/app/core/interceptors/api.interceptor.ts`

Angular 17 usa la API de interceptores funcionales (`HttpInterceptorFn`):

```typescript
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const apiReq = req.clone({ setHeaders: headers });

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        router.navigate(["/auth/login"]);
      }
      return throwError(() => error);
    }),
  );
};
```

**Flujo:**

1. El interceptor se activa en **cada petición HTTP** saliente.
2. Lee el token JWT de `localStorage` (clave `auth_token`), almacenado al hacer login.
3. Clona la request y agrega el header `Authorization: Bearer <token>`.
4. Si el backend responde con `401 Unauthorized`, limpia el storage y redirige al login.

El interceptor se registra en `app.config.ts` con `withInterceptors([apiInterceptor])`.

---

## WebSocket Colaborativo

### Capa de Servicio — Frontend

**Archivo:** `frontend/src/app/core/services/websocket.service.ts`

```typescript
public connect(): RxStomp {
  if (!this.rxStomp) {
    this.rxStomp = new RxStomp();
    const token = localStorage.getItem('auth_token');
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    const wsUrl = baseUrl.replace('http', 'ws') + '/ws-workflow';

    this.rxStomp.configure({
      brokerURL: wsUrl,          // ws://backend:8080/ws-workflow
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 2000,
    });
    this.rxStomp.activate();
  }
  return this.rxStomp;
}
```

`WebsocketService` es un singleton (`providedIn: 'root'`) que mantiene una única conexión STOMP por sesión. La URL del WebSocket se deriva dinámicamente del `environment.apiUrl` para funcionar tanto en local como en producción (detrás de Nginx).

### Suscripción por Política — Frontend

En `PolicyDesignerComponent`, al abrir un diagrama:

```typescript
connectWebSocket(policyId: string): void {
  const rxStomp = this.wsService.getStompClient();
  this.stompSub = rxStomp.watch(`/topic/policy/${policyId}`)
    .subscribe(message => {
      const event = JSON.parse(message.body);
      this.ngZone.run(() => this.handleWebSocketEvent(event));
    });
}
```

- Cada política tiene su propio **topic** `/topic/policy/{uuid}`.
- Los eventos recibidos se procesan dentro de `ngZone.run()` para triggear la detección de cambios de Angular.

### Publicación de Eventos

Los cambios (mover nodo, agregar transición, cursor, etc.) se publican al backend:

```typescript
rxStomp.publish({
  destination: `/app/policy/${policyId}/node-moved`,
  body: JSON.stringify({ nodeId, x, y, userId }),
});
```

### Backend — Spring STOMP

El backend configura un endpoint STOMP en `/ws-workflow` con prefijo de aplicación `/app` y broker simple para `/topic`. Usa `SimpMessagingTemplate` para reenviar eventos a todos los suscriptores del topic de la política:

```java
simpMessagingTemplate.convertAndSend(
  "/topic/policy/" + policyId,
  eventPayload
);
```

---

## Captura del Movimiento del Mouse

El cursor del usuario se transmite en tiempo real a todos los colaboradores que tienen el mismo diagrama abierto.

### Captura (Frontend)

El div del canvas tiene un listener `mousemove`:

```html
<div
  class="flex-1 overflow-auto relative"
  (mousemove)="onGlobalMouseMove($event)"
  ...
></div>
```

```typescript
onGlobalMouseMove(event: MouseEvent): void {
  // Throttle: máximo 1 publicación cada 50ms
  const now = Date.now();
  if (now - this.lastCursorPublish < 50) return;
  this.lastCursorPublish = now;

  const user = this.authService.currentUser();
  const policyId = this.selectedPolicy()?.uuid;
  if (!user || !policyId) return;

  const rxStomp = this.wsService.getStompClient();
  rxStomp.publish({
    destination: `/app/policy/${policyId}/cursor`,
    body: JSON.stringify({
      userId: user.uuid,
      name: `${user.name} ${user.lastname}`,
      x: event.offsetX,
      y: event.offsetY,
    })
  });
}
```

### Renderizado de Cursores de Colaboradores

Los cursores recibidos se almacenan en el signal `collaboratorCursors` (mapa por userId). La función `getActiveCursors()` filtra los cursores con `lastUpdate` de los últimos 5 segundos (para eliminar cursores de usuarios desconectados).

```html
@for (cursor of getActiveCursors(); track cursor.id) {
<div
  class="absolute pointer-events-none z-[100]"
  [style.left.px]="cursor.x"
  [style.top.px]="cursor.y"
>
  <!-- Icono de cursor SVG (flecha azul rotada -12°) -->
  <svg ...><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>
  <!-- Badge con el nombre del colaborador -->
  <span
    class="rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
  >
    {{ cursor.name }}
  </span>
</div>
}
```

El elemento tiene `transition-all duration-100 ease-linear` para suavizar el movimiento entre actualizaciones.

---

## IA en el Proyecto

### Arquitectura de la IA

```
[Frontend Angular]
        │  HTTP POST /api/v1/ai/*
        ▼
[Backend Spring Boot]  ←→  AiFeatureController
        │  HTTP interno
        ▼
[ia_service FastAPI]   ←→  Groq API (LLaMA)
```

El backend actúa como proxy: recibe la petición del frontend, enriquece el contexto (agrega datos reales de la BD como departamentos, usuarios, etc.) y llama al ia_service.

### Modelos de Lenguaje

| Modelo                    | Uso                                                      |
| ------------------------- | -------------------------------------------------------- |
| `llama-3.3-70b-versatile` | Chat de asistente, routing NLP, analíticas               |
| `llama-3.1-8b-instant`    | Generación de JSON estructurado (políticas, formularios) |

El modelo "instant" (`8b`) se usa con `response_format={"type": "json_object"}` para garantizar JSON válido en la respuesta.

### Endpoints de IA

**ia_service** expone en `/api/v1/ai`:

| Endpoint                      | Descripción                                         |
| ----------------------------- | --------------------------------------------------- |
| `POST /generate-policy`       | Genera un diagrama de política completo desde texto |
| `POST /assistant/chat`        | Chat conversacional sobre el workflow activo        |
| `POST /recommend-assignee`    | Recomienda el empleado más adecuado para una tarea  |
| `POST /nlp/navigate`          | Interpreta comandos de voz para navegar la UI       |
| `POST /nlp/fill-form`         | Rellena campos de formulario desde lenguaje natural |
| `POST /analytics/bottlenecks` | Detecta cuellos de botella en el proceso            |

### Generación de Políticas con IA

Cuando el usuario describe un proceso en lenguaje natural, el flujo es:

1. **Frontend** → `POST /api/v1/policies/generate` con `{ description, departments? }`.
2. **Backend** (`AiFeatureController`): recupera los departamentos reales de `DepartmentService.getAll()` y los incluye en el request al ia_service.
3. **ia_service**: construye un prompt que instruye al modelo a usar **únicamente** los departamentos de la lista recibida — sin inventar departamentos inexistentes.
4. El modelo devuelve un JSON con la estructura de la política (nodos, transiciones, lanes).
5. El backend parsea el JSON y devuelve la política al frontend, que la renderiza en el canvas.

### Prompt de Generación (resumen)

```python
# En ia_service/application/ai_service.py
prompt = f"""
Eres un experto en modelado de procesos de negocio...
Usa ÚNICAMENTE departamentos de esta lista: {departments_json}.
NO inventes ni agregues departamentos que no estén en esa lista.
Genera el diagrama en formato JSON con la estructura: {{ nodes: [...], transitions: [...], lanes: [...] }}
"""
```

---

## Infraestructura y Despliegue

### Docker Compose

Tres servicios en red `app-network`:

```yaml
services:
  ia_service:
    build: ./ia_service
    expose: [8000] # Solo visible internamente

  backend:
    build: ./backend
    expose: [8080] # Solo visible internamente
    environment:
      AI_MICROSERVICE_URL: http://ia_service:8000/api/v1/ai

  frontend:
    build: ./frontend
    ports: ["80:80"] # Único puerto expuesto al exterior
    depends_on: [backend]
```

### Nginx (Producción)

```nginx
# Proxy API → backend
location /api/v1 {
  proxy_pass http://backend:8080/api/v1;
}

# Proxy WebSocket → backend
location /ws-workflow {
  proxy_pass http://backend:8080/ws-workflow;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}

# SPA fallback
location / {
  try_files $uri $uri/ /index.html;
}
```

### Variables de Entorno

| Servicio   | Variables principales                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| backend    | `MONGODB_URI`, `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `FRONTEND_URL` |
| ia_service | `GROQ_API_KEY`                                                                |

Las variables se cargan desde archivos `.env` (no versionados) a través de `env_file` en docker-compose.
