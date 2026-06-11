# Análisis del Motor de Inteligencia Artificial: LLM vs. Deep Learning

Este documento detalla la arquitectura de inteligencia artificial implementada en el proyecto, explicando cómo se generan los reportes y cómo funciona cada modelo de **Deep Learning** local.

---

## 1. ¿Cómo se generan los informes actuales? (LLM vs. Deep Learning)

Para responder a la pregunta clave: **Los reportes y análisis textuales que solicita el usuario NO utilizan los modelos locales de Deep Learning (TensorFlow); se realizan de manera 100% dinámica mediante el LLM (Llama 3 a través de Groq).**

### Razón del diseño
La generación de reportes requiere resolver consultas extremadamente variables. El usuario puede pedir combinaciones arbitrarias de filtros por departamentos, ordenamientos (los más lentos, los más rápidos), límites (top 3, top 10), agrupaciones (por estado, por política), gráficos (de barras o pastel) y campos adicionales (nombres de funcionarios, roles).

Un modelo de Deep Learning tradicional (como una red neuronal de clasificación o regresión) tiene salidas rígidas de tamaño fijo y no posee capacidad de razonamiento simbólico. No puede traducir una frase en español a una consulta estructurada de base de datos. En cambio, el **LLM** es ideal para esto porque actúa como un compilador de lenguaje natural a código estructurado.

---

### Flujo paso a paso para la generación de reportes

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Frontend as Frontend Angular
    participant Backend as Backend Spring Boot
    participant FastAPI as FastAPI (ia_service)
    participant LLM as Groq (Llama-3.3-70b)
    database Mongo as MongoDB Atlas

    Usuario->>Frontend: Solicita reporte ("Quiero un PDF de...")
    Frontend->>Backend: Envía prompt de reporte
    Backend->>FastAPI: POST /api/v1/ai/compile-report { prompt }
    Note over FastAPI,LLM: Fase de Compilación (LLM)
    FastAPI->>LLM: Envía Prompt + Esquema de Reporte + Reglas MongoDB
    LLM-->>FastAPI: Retorna JSON (pipeline de agregación, columnas, kpis, chart)
    FastAPI-->>Backend: Devuelve especificación JSON limpia
    
    Note over Backend,Mongo: Ejecución en BD (MongoDB)
    Backend->>Mongo: Ejecuta el pipeline de agregación compilado
    Mongo-->>Backend: Retorna datos crudos (JSON array)

    Note over Backend,LLM: Fase de Análisis (LLM)
    Backend->>FastAPI: POST /api/v1/ai/analyze-report-data { prompt, data }
    FastAPI->>LLM: Solicita redacción de análisis ejecutivo sobre los datos
    LLM-->>FastAPI: Retorna análisis en prosa (2-3 párrafos)
    FastAPI-->>Backend: Devuelve análisis de texto
    
    Note over Backend: Renderizado de Reporte
    Backend->>Backend: Inyecta datos, análisis (Times New Roman 13pt) e imágenes del gráfico en el PDF
    Backend-->>Frontend: Retorna archivo PDF compilado
    Frontend-->>Usuario: Descarga/Muestra PDF
```

1. **Clasificación del Intent (`nlp_intent`)**:
   El asistente recibe la frase. El LLM clasifica el texto y detecta que la intención es `"compile_report"`.
2. **Compilación de la Consulta (`compile_report`)**:
   La petición llega a `ai_service.py`. Se ejecuta un preprocesador que busca regex generales de departamentos y políticas para guiar al modelo. Luego, se envía la frase al LLM (Groq) con un System Prompt muy estricto que describe la estructura de las colecciones MongoDB (`policy_instances`, `policies`, `users`, `departments`). El LLM responde estructurando un JSON con el título del reporte, la descripción, el pipeline de agregación MongoDB, las columnas a pintar, los KPIs y la especificación del gráfico.
3. **Ejecución en Base de Datos**:
   El Spring Boot recibe la especificación y ejecuta la agregación en MongoDB Atlas. Esto retorna los documentos reales (por ejemplo, las actividades con sus promedios en horas).
4. **Narrativa Ejecutiva (`analyze_report_data`)**:
   Una vez que el backend tiene los datos, los envía de vuelta a FastAPI junto al prompt original del usuario. El LLM lee estos datos y redacta un reporte ejecutivo en español de 2 a 3 párrafos, identificando cuellos de botella reales y sugiriendo mejoras.
5. **Generación del Documento**:
   El backend toma el texto ejecutivo redactado por el LLM, genera la imagen del gráfico de barras/pastel usando los datos, y compila el PDF (aplicando las directrices tipográficas como Times New Roman a 13pt).

---

## 2. ¿Cómo funciona el Motor de Deep Learning (TensorFlow)?

El motor de Deep Learning local se encuentra en la carpeta `ia_service/deeplearning/`. Está diseñado para tareas predictivas rápidas de baja latencia y detección de patrones de comportamiento (anomalías) que no requieren un LLM de propósito general. Consta de tres modelos independientes creados en **TensorFlow/Keras**.

### 2.1 Enrutador de Intenciones (`NlpIntentClassifier`)
*   **Archivo**: `nlp_intent_classifier.py`
*   **Objetivo**: Predecir a qué política (ID de flujo de trabajo) pertenece un texto enviado por un usuario (por ejemplo, *"Quiero pedir vacaciones"* -> solicita el UUID de la política de Vacaciones).
*   **Arquitectura**:
    *   **Capa de Entrada**: Recibe secuencias de texto limpias y tokenizadas, con un padding fijo a una longitud de 50 palabras (`maxlen=50`).
    *   **Capa de Embedding**: Mapea palabras a un espacio continuo de 128 dimensiones (`Embedding(input_dim=5000, output_dim=128)`).
    *   **Capa LSTM**: Procesa la secuencia de manera temporal con 64 unidades LSTM, permitiendo capturar el contexto bidireccional y dependencias a largo plazo de la frase.
    *   **Capa Intermedia**: Capa densa de 32 neuronas con activación ReLU para extraer características complejas.
    *   **Capa de Salida**: Capa densa con activación Softmax que calcula la distribución de probabilidad sobre todas las políticas del sistema.
*   **Entrenamiento**:
    *   Se alimenta del dataset `nlp_training_data.csv` (generado por `data_generator.py`).
    *   Usa codificadores de etiquetas (`LabelEncoder`) y tokenizadores (`Tokenizer`) serializados en archivos `.pkl` junto con el modelo `.keras`.

---

### 2.2 Detector de Anomalías y Cuellos de Botella (`BottleneckDetector`)
*   **Archivo**: `bottleneck_autoencoder.py`
*   **Objetivo**: Identificar si un trámite actual está tardando más de lo habitual o si hay retrasos anómalos en el flujo del sistema.
*   **Arquitectura (Autoencoder)**:
    Un Autoencoder es una red neuronal no supervisada diseñada para reconstruir su propia entrada ($X \approx \hat{X}$).
    *   **Encoder (Compresión)**: Toma características escaladas del trámite (`department_id` codificado, `day_of_week`, `hour_of_day`, `duration_hours`, `task_id` codificado) y las comprime a través de capas densas (`Dense(32) -> Dense(16) -> Dense(8)`).
    *   **Decoder (Descompresión)**: Intenta reconstruir las características originales a partir de la representación comprimida de 8 dimensiones (`Dense(16) -> Dense(32) -> Dense(input_dim)`).
*   **Lógica de Detección de Cuellos de Botella**:
    *   **Entrenamiento semi-supervisado**: La red se entrena **únicamente** con datos de ejecuciones normales (`is_anomaly = False`). Aprende a reconstruir perfectamente los casos de trámites rápidos y fluidos.
    *   **Cálculo del Umbral**: Al final del entrenamiento, se calcula el error cuadrático medio (MSE) de reconstrucción en el conjunto de entrenamiento. Se define el umbral de anomalía como:
        $$\text{Umbral} = \mu(\text{MSE}) + 2 \cdot \sigma(\text{MSE})$$
        donde $\mu$ es el promedio y $\sigma$ la desviación estándar.
    *   **Clasificación de Anomalías**: En producción, si un trámite tiene un error de reconstrucción $\text{MSE} > \text{Umbral}$, significa que la red no pudo reconstruirlo bien (porque es una combinación inusual de retraso excesivo en una determinada actividad o departamento). Se marca como **anomalía/cuello de botella** y se calcula un puntaje de riesgo (`risk_score`).

---

### 2.3 Predictor de Tiempos de Completación (`CompletionPredictor`)
*   **Archivo**: `completion_predictor.py`
*   **Objetivo**: Estimar el tiempo en horas que tardará una actividad en completarse y recomendar al funcionario más óptimo para resolverla.
*   **Arquitectura (Regresión)**:
    *   **Entradas**: Características concatenadas: `policy_id` (codificado), `activity_id` (codificado), `employee_id` (codificado) y `pending_tasks` (número de tareas en la bandeja de entrada del empleado).
    *   **Estructura**: Red densa profunda (`Dense(64) -> Dense(32) -> Dense(16) -> Dense(1, activación lineal)`).
    *   **Salida**: Un valor numérico que representa el estimado de horas de resolución.
*   **Cálculo del Asignado Óptimo (`find_best_assignee`)**:
    Cuando se necesita asignar una tarea a un conjunto de empleados disponibles:
    1. Se calcula la predicción de tiempo para cada candidato utilizando su carga actual (`pending_tasks`) e historial.
    2. El modelo retorna la lista con las estimaciones de todos los candidatos.
    3. El sistema selecciona al empleado que minimiza el tiempo estimado de resolución (`estimated_hours`), evitando sobrecargar a los empleados más eficientes.

---

## 3. Flujo de Datos y Entrenamiento del Motor local

```mermaid
graph TD
    subgraph Spring Boot Backend
        DB[(MongoDB Atlas)] -->|Export API| Export[api/v1/export/training-data]
    end
    
    subgraph Generación y Carga
        Export -->|HTTP GET| Gen[scripts/data_generator.py]
        Gen -->|Genera CSVs| CSV[deeplearning/training_data/]
    end

    subgraph Entrenamiento en TensorFlow
        CSV -->|Carga de Datasets| Train[scripts/train_models.py / POST /dl/train]
        Train -->|Ajuste de Pesos| Fit[Keras Model FIT]
        Fit -->|Exportación| Models[deeplearning/saved_models/]
    end

    subgraph Producción (Inferencia)
        Models -->|Carga de Pesos y Scalers| FastAPI[api/dl_router.py]
        FastAPI -->|POST /dl/route-intent| Predict1[Identificación de Política]
        FastAPI -->|POST /dl/analyze-bottlenecks| Predict2[Detección de Retrasos]
        FastAPI -->|POST /dl/best-route| Predict3[Asignación de Empleado]
    end
```

*   **Generador de Datos (`data_generator.py`)**:
    Es un script que consume las políticas, usuarios e instancias del backend para producir datos estructurados en formato CSV. Crea plantillas de NLP y simula duraciones con dependencias del número de tareas del empleado y de anomalías inyectadas (retrasos de 24-120 horas).
*   **Entrenamiento (`train_models.py`)**:
    Toma los archivos CSV de `deeplearning/training_data/`, entrena las arquitecturas TensorFlow mencionadas, ajusta los hiperparámetros y guarda los archivos `.keras`/`.h5` de pesos neuronales, así como los escaladores (`StandardScaler`) y codificadores (`LabelEncoder`, `Tokenizer`) necesarios para preprocesar los datos en tiempo real.
*   **Consumo (`dl_router.py`)**:
    Los endpoints `/dl/route-intent`, `/dl/analyze-bottlenecks` y `/dl/best-route` cargan estos modelos de forma diferida (lazy load) y realizan inferencias en milisegundos sin necesidad de llamar a APIs externas (Groq/OpenAI).

---

## 4. Tabla Comparativa: LLM vs. Deep Learning en el Sistema

| Característica | Capa LLM (Reportes y Flujos Dinámicos) | Capa Deep Learning Local (TensorFlow) |
| :--- | :--- | :--- |
| **Tecnología** | Modelos pre-entrenados grandes (Llama 3.3 70B en Groq) | Redes Neuronales locales (Keras / TensorFlow 2.x) |
| **Uso Principal** | Compilación de pipelines de agregación, redacción de informes narrativos, diseño y edición de diagramas BPMN. | Clasificación de intenciones a políticas, predicción de tiempos de finalización, detección de anomalías y asignación inteligente. |
| **Flexibilidad** | **Muy Alta**: Resuelve preguntas complejas y redacta explicaciones en lenguaje natural con tono formal. | **Baja/Fija**: Las entradas y salidas estructurales de las redes están definidas en la arquitectura del modelo. |
| **Latencia** | Media (1.5s - 3s por petición debido al procesamiento externo de tokens). | Muy Baja (< 50ms por inferencia local en la CPU/GPU del servidor). |
| **Entrenamiento** | No requiere entrenamiento local (se usa Prompt Engineering avanzado, reglas fijas y schemas). | Requiere generación de datos (CSV) y reentrenamiento (`/dl/train`) cuando cambian las políticas activas. |
| **Dependencia** | Requiere conexión a internet y API Key válida de Groq. | 100% autónomo y fuera de línea (corre en el contenedor de `ia_service`). |
