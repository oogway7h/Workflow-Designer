# Guía de Prompts para Reportes Dinámicos (NLP)

Esta guía presenta ejemplos de consultas en lenguaje natural (prompts) agrupadas por casos de uso y características para probar el compilador de reportes de **Workflow Designer**.

---

## 📊 1. Reportes Estadísticos y Gráficos (Visuales)

- **Prompt**: `Muestra el porcentaje de solicitudes completadas vs activas en un gráfico de pastel`
  - **Objetivo**: Graficar la distribución de estados de las instancias usando un gráfico circular.
- **Prompt**: `Genera un reporte del promedio de duración por actividad del flujo de vacaciones y agrega un gráfico de barras`
  - **Objetivo**: Agrupar las duraciones por actividad filtrando por la política de vacaciones y graficar.

---

## 🧠 2. Reportes con Análisis Textual (Cognitivos)

- **Prompt**: `Quiero que me digas en un reporte en pdf por qué existe cuellos de botella en la política de aprobación de presupuesto mensual`
  - **Objetivo**: Identificar la actividad más lenta y generar de 2 a 3 párrafos de análisis cognitivo redactados por el LLM explicándolo en Times New Roman 13pt.
- **Prompt**: `Analiza por qué los trámites del departamento de Recursos Humanos están tardando tanto tiempo y muéstralo en un gráfico de barras`
  - **Objetivo**: Filtrar por el departamento de Recursos Humanos, identificar retrasos, redactar el análisis textual en el PDF e incrustar el gráfico de barras correspondiente.

---

## ⏱️ 3. Reportes de Duración y Optimización (Ordenamiento Dinámico)

- **Prompt**: `Muestra las actividades de todos los flujos ordenadas de la más rápida a la más lenta`
  - **Objetivo**: Ejecutar la agregación con ordenamiento ascendente (`{"$sort": {"avgDurationHours": 1}}`).
- **Prompt**: `muestra las instancias del departamento legal que mas tardaron en hacerse, haz un top 3 en un grafico patel`
  - **Objetivo**: Filtrar usuarios del departamento legal, calcular duraciones de instancias (`updatedAt - createdAt`), ordenar descendentemente, limitar a 3 resultados y graficar en un pastel.

### mas prompts

" "

"Quiero que me digas en un reporte en pdf por qué existe cuellos de botella en la política de aprobación de presupuesto mensual."

"Analiza por qué los trámites del departamento de Recursos Humanos están tardando tanto tiempo y muéstralo en un gráfico de barras"

"Muestra el porcentaje de solicitudes completadas vs activas en un gráfico de pastel"

"Muestra un gráfico de barras del promedio de duración por actividad del flujo de contratación de personal".
