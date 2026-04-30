# Iteraci�n Final: Endpoints de Funcionario (Employee)

## 1. Resumen de Implementaci�n

En esta iteraci�n se consolida la experiencia del Funcionario (Employee) en el motor de workflow. Se ha implementado un Dashboard para visualizar estad�sticas de actividades, la capacidad de ver el historial de tareas, y m�todos dedicados para que los funcionarios puedan completar las actividades que tienen asignadas directamente.

## 2. Nuevos Endpoints Implementados en el `WorkflowController`

### 2.1. Funcionario: Completar una Tarea de un Workflow

**Endpoint:** `POST /api/v1/workflow/tasks/{instanceUuid}/complete`

- **Controller/Seguridad:** Asegurado con `@PreAuthorize("hasRole('EMPLOYEE')")`.
- **L�gica:**
  - Extrae el usuario logueado mediante el contexto de seguridad.
  - Recibe un payload JSON (`TaskCompletionRequest`) con los datos capturados en el formulario de la tarea (`taskData`).
  - Avanza el flujo en la instancia actualizando el estado, reevaluando las transiciones seg�n el diagrama base y registrando en el `history` lo ejecutado y completado (vinculado a su UUID).

### 2.2. Funcionario: Ver Dashboard de Resumen

**Endpoint:** `GET /api/v1/workflow/dashboard/employee`

- **Controller/Seguridad:** Asegurado con `@PreAuthorize("hasRole('EMPLOYEE')")`.
- **Nuevo DTO:** `EmployeeDashboardDTO` (creado para simplificar la visi�n del cliente).
- **L�gica:**
  - Cuenta el volumen de tareas activas/pendientes asignadas a su identificador de usuario o a su rol de empleado.
  - Calcula la volumetr�a de tareas hist�ricas participadas/completadas por el empleado.
  - Retorna una sub-lista del historial (limitado a sus 5 tareas completadas m�s recientes) para el muro de notificaciones r�pidas del front-end.

### 2.3. Funcionario (y otros Roles): Ver el Historial de una Tarea/Instancia

**Endpoint:** `GET /api/v1/workflow/instances/{instanceUuid}/history`

- **Controller/Seguridad:** Asegurado con `@PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")`.
- **L�gica:**
  - Retorna una auditor�a cronol�gica (`HistoryTimelineDTO`) exclusiva de una instancia (`PolicyInstance`) especificada.
  - Contiene informaci�n validada de "qui�n movi� qu� ficha", la marca de tiempo de finalizaci�n (`timestamp`) y el r�tulo de qu� Actividad se complet�.

## 3. Endpoints Preexistentes Reutilizados

- **Ver tareas pendientes (`GET /api/v1/workflow/tasks/pending`):** Sigue proveyendo la bandeja de entrada (Inbox).
- **Formularios Din�micos (`GET /api/v1/workflow/instances/{instanceUuid}`):** Prove�a ya el `formSchemaJson` embebido de la tarea asignada actualmente para rendirla en web con su estado.
