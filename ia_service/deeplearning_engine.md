## 1. Arquitectura general

El motor de Deep Learning de `ia_service` está implementado en `ia_service/deeplearning/` y consta de tres modelos independientes:

- `NlpIntentClassifier` (`nlp_intent_classifier.py`)
- `BottleneckDetector` (`bottleneck_autoencoder.py`)
- `CompletionPredictor` (`completion_predictor.py`)

Estos modelos son TensorFlow/Keras puros, y se guardan en disco bajo `ia_service/deeplearning/saved_models/`.

Además hay un router FastAPI separado en `ia_service/api/dl_router.py` que expone estos modelos como servicios HTTP bajo `/dl`.

> Nota: `ia_service/application/ai_service.py` contiene una capa diferente que usa Groq (modelos externos de LLM) para otras tareas de IA. El motor deep learning local es independiente y se llama vía `dl_router.py`.

## 2. Componentes principales

### 2.1 NlpIntentClassifier

Archivo: `ia_service/deeplearning/nlp_intent_classifier.py`

Función:

- Clasificar texto en la política correcta usando un modelo LSTM.
- Se entrena con pares `text -> policy_id`.

Flujo básico:

1. `train(texts, labels)`:
   - limpia el texto (`lowercase`, elimina acentos, quita caracteres no alfanuméricos)
   - tokeniza con `Tokenizer(num_words=5000, oov_token='<OOV>')`
   - convierte a secuencias y aplica `pad_sequences(maxlen=50)`
   - codifica etiquetas con `LabelEncoder`
   - construye un modelo Keras:
     - Embedding(5000, 128, input_length=50)
     - LSTM(64)
     - Dense(32, relu)
     - Dense(num_classes, softmax)
   - compila con `sparse_categorical_crossentropy` y `adam`
   - entrena y guarda:
     - `nlp_router.keras`
     - `tokenizer.pkl`
     - `label_encoder.pkl`

2. `predict(text)`:
   - limpia y tokeniza el texto de entrada
   - obtiene probabilidades con `model.predict`
   - ordena las clases por confianza
   - devuelve:
     - `policy_id` mejor clasificada
     - `confidence`
     - `all_predictions` con la lista completa de políticas

Puntos relevantes para cambiar:

- `self.max_len` y `self.vocab_size` pueden ajustarse para texto más largo o vocabulario más amplio.
- El preprocesamiento de texto está en `_preprocess_text`; ahí puedes adaptar reglas de normalización.
- El modelo actual es sencillo; puedes cambiar LSTM por `GRU`, `Bidirectional`, o agregar `Dropout`.

### 2.2 BottleneckDetector

Archivo: `ia_service/deeplearning/bottleneck_autoencoder.py`

Función:

- Detectar anomalías en tiempos / eventos de proceso usando un autoencoder.
- Se entrena con datos normales (no anomalías) y luego calcula qué registros tienen error de reconstrucción alto.

Flujo básico:

1. `train(normal_data)`:
   - codifica `department_id` y `task_id` con `LabelEncoder`
   - normaliza con `StandardScaler`
   - construye autoencoder Keras:
     - Input -> Dense(32) -> Dense(16) -> Dense(8)
     - Decodificador: Dense(16) -> Dense(32) -> Dense(input_dim)
   - compila con `adam` y `mse`
   - entrena en `X -> X`
   - calcula `threshold = mean(mse) + 2*std(mse)`
   - guarda:
     - `bottleneck_autoencoder.keras`
     - `dept_encoder.pkl`
     - `task_encoder.pkl`
     - `bottleneck_scaler.pkl`
     - `bottleneck_threshold.pkl`

2. `detect_anomalies(data)`:
   - codifica y normaliza las entradas
   - reconstruye con el autoencoder
   - calcula MSE por fila
   - marca anomalía si `error > threshold`
   - genera un `risk_score` entre 0 y 1

Puntos relevantes para cambiar:

- Si tus datos tienen más columnas, actualiza `_prepare_data` con nuevas características.
- El umbral de anomalía es `mean + 2*std`; puedes cambiarlo por `quantile` u otro criterio.
- El autoencoder actual es completamente denso; puedes aumentar la capacidad o usar una arquitectura distinta.

### 2.3 CompletionPredictor

Archivo: `ia_service/deeplearning/completion_predictor.py`

Función:

- Predecir horas de finalización de una actividad / sugerir el mejor empleado.
- Usa regresión sobre características categóricas codificadas.

Flujo básico:

1. `train(data)`:
   - codifica `policy_id`, `activity_id`, `employee_id` con `LabelEncoder`
   - usa `pending_tasks` como valor numérico
   - normaliza todo con `StandardScaler`
   - construye modelo Keras:
     - Dense(64, relu)
     - Dense(32, relu)
     - Dense(16, relu)
     - Dense(1, linear)
   - compila con `adam`, `mse` y métrica `mae`
   - entrena en `X_scaled -> y`
   - guarda el modelo y los codificadores/scaler

2. `predict(policy_id, activity_id, employee_id, pending_tasks)`:
   - codifica valores categóricos
   - escala la fila
   - predice horas
   - asegura que el resultado sea al menos `0.1`

3. `find_best_assignee(policy_id, activity_id, candidates)`:
   - calcula la predicción para cada candidato
   - devuelve el candidato con menor `estimated_hours`

Puntos relevantes para cambiar:

- El enfoque actual trata todas las IDs como categorías codificadas; si tienes más información de empleados, agrégala como nuevas columnas.
- Puedes cambiar la arquitectura a redes más profundas, `Dropout`, o incluso a un modelo no lineal como un `RandomForest` en lugar de Keras.
- El fallback de etiquetas desconocidas es `0`; puedes hacer un manejo más robusto con `unknown` o embeddings.

## 3. Flujo de datos y entrenamiento

### 3.1 Generación de datos

- `ia_service/scripts/data_generator.py` genera archivos CSV de entrenamiento para los tres modelos.
- La ubicación de salida es `ia_service/deeplearning/training_data/`.
- Los archivos esperados son:
  - `nlp_training_data.csv`
  - `bottleneck_training_data.csv`
  - `completion_training_data.csv`

### 3.2 Entrenamiento principal

- `ia_service/scripts/train_models.py` orquesta el entrenamiento completo:
  1. obtiene datos reales del backend (`/api/v1/export/training-data`) o usa datos dummy
  2. llama a `NlpIntentClassifier.train(...)`
  3. llama a `BottleneckDetector.train(...)`
  4. llama a `CompletionPredictor.train(...)`

- También hay un endpoint FastAPI de entrenamiento en `ia_service/api/dl_router.py`:
  - `POST /dl/train`
  - recibe `epochs_nlp`, `epochs_bottleneck`, `epochs_completion`
  - entrena los tres modelos desde CSV

### 3.3 Guardado de modelos

Modelos y artefactos guardados en:

- `ia_service/deeplearning/saved_models/nlp_router.keras`
- `ia_service/deeplearning/saved_models/tokenizer.pkl`
- `ia_service/deeplearning/saved_models/label_encoder.pkl`
- `ia_service/deeplearning/saved_models/bottleneck_autoencoder.keras`
- `ia_service/deeplearning/saved_models/dept_encoder.pkl`
- `ia_service/deeplearning/saved_models/task_encoder.pkl`
- `ia_service/deeplearning/saved_models/bottleneck_scaler.pkl`
- `ia_service/deeplearning/saved_models/bottleneck_threshold.pkl`
- `ia_service/deeplearning/saved_models/completion_predictor.keras`
- `ia_service/deeplearning/saved_models/policy_encoder.pkl`
- `ia_service/deeplearning/saved_models/activity_encoder.pkl`
- `ia_service/deeplearning/saved_models/employee_encoder.pkl`
- `ia_service/deeplearning/saved_models/completion_scaler.pkl`

Si borras estos archivos, los modelos quedan no entrenados y las rutas `/dl/*` devolverán error hasta que se reentrene.

## 4. Endpoints del router DL

Archivo: `ia_service/api/dl_router.py`

- `POST /dl/route-intent`
  - Usa el modelo LSTM para clasificar texto a `policy_id`.
- `POST /dl/analyze-bottlenecks`
  - Usa el autoencoder para detectar anomalías en datos de ejecución.
- `POST /dl/best-route`
  - Usa el regresor para estimar horas y seleccionar al mejor empleado.
- `POST /dl/train`
  - Entrena los modelos a partir de los CSV de `training_data`.
- `GET /dl/status`
  - Comprueba si el modelo NLP está entrenado y si hay políticas activas no cubiertas por las clases entrenadas.

## 5. Dónde hacer cambios

### 5.1 Cambiar arquitectura del modelo

Edita el archivo del modelo correspondiente:

- `ia_service/deeplearning/nlp_intent_classifier.py`
- `ia_service/deeplearning/bottleneck_autoencoder.py`
- `ia_service/deeplearning/completion_predictor.py`

Típicos cambios:

- Añadir o cambiar capas
- Modificar activaciones
- Aplicar regularización (`Dropout`, `BatchNormalization`)
- Cambiar optimizador o tasa de aprendizaje

### 5.2 Cambiar preprocesamiento

- Texto NLP: `_preprocess_text` en `nlp_intent_classifier.py`
- Categóricos y numéricos: `_prepare_data` en `bottleneck_autoencoder.py`
  y `CompletionPredictor.train`
- Si agregas nuevas características, actualiza la construcción de `X` y la forma de la red.

### 5.3 Cambiar datos de entrenamiento

- Genera o modifica `ia_service/deeplearning/training_data/*.csv`
- Si tus tablas cambian, adapta `data_generator.py` para extraer nuevas columnas
- Usa `ia_service/scripts/train_models.py` o `POST /dl/train` para volver a entrenar

### 5.4 Cambiar el comportamiento en producción

- Si quieres añadir validaciones o nuevos resultados, modifica `ia_service/api/dl_router.py`.
- Para lógica de negocio adicional, extiende los métodos `find_best_assignee`, `detect_anomalies` o `predict`.
- Si deseas exponer nuevos servicios, agrega un nuevo endpoint en `dl_router.py` y un nuevo método en el modelo correspondiente.

## 6. Consejos para avanzar

- Comprueba que TensorFlow esté instalado y que el entorno tenga GPU si el entrenamiento es lento.
- Antes de cambiar la arquitectura, prueba con pocas épocas (`epochs=5`) para validar que el pipeline funciona.
- Haz copia de seguridad de `deeplearning/saved_models/` antes de experimentar.
- Si el archivo CSV de entrenamiento contiene valores nulos, limpia o filtra esos registros antes de entrenar.

## 7. Resumen rápido

- `ia_service/deeplearning/`: lógica de modelos locales TensorFlow
- `ia_service/deeplearning/training_data/`: datos CSV de entrenamiento
- `ia_service/deeplearning/saved_models/`: modelos entrenados y codificadores
- `ia_service/scripts/train_models.py`: script de entrenamiento completo
- `ia_service/api/dl_router.py`: endpoints HTTP para el motor DL

Con esta guía puedes identificar rápidamente qué cambiar para ajustar el motor de Deep Learning y dónde encontrar cada componente.
