package com.primer.parcialse.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NlpQueryCompilerService {

    private final AiIntegrationService aiIntegrationService;
    private final MongoTemplate mongoTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @SuppressWarnings("unchecked")
    public Map<String, Object> compileAndExecuteReport(String prompt) {
        // 1. Call ia_service to compile prompt to Report JSON
        Object rawResponse = aiIntegrationService.compileReport(Map.of("prompt", prompt));
        Map<String, Object> reportSchema = objectMapper.convertValue(rawResponse, Map.class);

        String collectionName = (String) reportSchema.get("collection");
        List<Object> pipelineStages = (List<Object>) reportSchema.get("pipeline");

        // 2. Convert JSON stages to BSON Documents for native MongoDB query
        List<Document> dbResults = new ArrayList<>();
        String pipelineError = null;

        if (collectionName != null && !collectionName.isEmpty()) {
            // First attempt
            pipelineError = executePipeline(collectionName, pipelineStages, dbResults);

            // Retry with error context if first attempt failed
            if (pipelineError != null && dbResults.isEmpty()) {
                System.err.println("Pipeline failed, retrying with error context: " + pipelineError);
                try {
                    Map<String, String> retryReq = new HashMap<>();
                    retryReq.put("prompt", prompt);
                    retryReq.put("error_context", pipelineError);
                    Object retryResponse = aiIntegrationService.compileReport(retryReq);
                    Map<String, Object> retrySchema = objectMapper.convertValue(retryResponse, Map.class);

                    // Update schema with retry results
                    reportSchema = retrySchema;
                    collectionName = (String) retrySchema.get("collection");
                    pipelineStages = (List<Object>) retrySchema.get("pipeline");

                    dbResults.clear();
                    String retryError = executePipeline(collectionName, pipelineStages, dbResults);
                    if (retryError != null) {
                        System.err.println("Retry also failed: " + retryError);
                        pipelineError = retryError;
                    } else {
                        pipelineError = null;
                    }
                } catch (Exception retryEx) {
                    System.err.println("Retry compile failed: " + retryEx.getMessage());
                }
            }
        }

        // 3. Convert BSON Documents to standard Java Maps
        List<Map<String, Object>> mappedResults = new ArrayList<>();
        for (Document doc : dbResults) {
            Map<String, Object> record = new HashMap<>(doc);
            if (record.containsKey("_id") && record.get("_id") != null) {
                record.put("_id", record.get("_id").toString());
            }
            mappedResults.add(record);
        }

        // 4. Resolve KPIs from query results
        List<Map<String, Object>> kpisSchema = (List<Map<String, Object>>) reportSchema.get("kpis");
        List<Map<String, Object>> resolvedKpis = new ArrayList<>();

        if (kpisSchema != null) {
            for (Map<String, Object> kpi : kpisSchema) {
                String title = (String) kpi.get("title");
                String valueKey = (String) kpi.get("value_key");
                String format = (String) kpi.get("format");
                Object val = null;

                if (!mappedResults.isEmpty()) {
                    Map<String, Object> firstRow = mappedResults.get(0);
                    if (firstRow.containsKey(valueKey)) {
                        val = firstRow.get(valueKey);
                    }
                }

                if (val == null) {
                    if ("count".equalsIgnoreCase(valueKey) || "total".equalsIgnoreCase(valueKey)) {
                        val = mappedResults.size();
                    } else {
                        val = 0;
                    }
                }

                Map<String, Object> kpiResult = new HashMap<>();
                kpiResult.put("title", title);
                kpiResult.put("value", val.toString());
                kpiResult.put("format", format);
                resolvedKpis.add(kpiResult);
            }
        }

        // 5. Determine if analysis text should be generated
        String description = reportSchema.get("description") != null ? reportSchema.get("description").toString() : "";
        String promptLower = prompt.toLowerCase();

        boolean isAnalysisPrompt = promptLower.contains("porque")
                || promptLower.contains("por qué")
                || promptLower.contains("por que")
                || promptLower.contains("razon")
                || promptLower.contains("razón")
                || promptLower.contains("motivo")
                || promptLower.contains("analiza")
                || promptLower.contains("explic")
                || promptLower.contains("cuello")
                || promptLower.contains("botella")
                || promptLower.contains("demora")
                || promptLower.contains("retraso")
                || promptLower.contains("tardando")
                || promptLower.contains("eficien")
                || promptLower.contains("optimiz")
                || promptLower.contains("mejorar")
                || promptLower.contains("problema");

        // Also trigger analysis for long/complex prompts (more than 15 words)
        if (!isAnalysisPrompt && prompt.split("\\s+").length > 15) {
            isAnalysisPrompt = true;
        }

        if (isAnalysisPrompt && !mappedResults.isEmpty()) {
            try {
                Map<String, Object> analyzeReq = new HashMap<>();
                analyzeReq.put("prompt", prompt);
                analyzeReq.put("data", mappedResults);
                Map<String, Object> analysisResult = aiIntegrationService.analyzeReportData(analyzeReq);
                if (analysisResult != null && analysisResult.containsKey("analysis")) {
                    description = (String) analysisResult.get("analysis");
                }
            } catch (Exception e) {
                System.err.println("Error al generar análisis textual con IA: " + e.getMessage());
            }
        }

        // 6. Build final response
        Map<String, Object> finalResult = new HashMap<>();
        finalResult.put("title", reportSchema.get("title"));
        finalResult.put("description", description);
        finalResult.put("columns", reportSchema.get("columns"));
        finalResult.put("kpis", resolvedKpis);
        finalResult.put("data", mappedResults);
        if (reportSchema.containsKey("chart")) {
            finalResult.put("chart", reportSchema.get("chart"));
        }
        if (pipelineError != null && mappedResults.isEmpty()) {
            finalResult.put("pipelineError", pipelineError);
        }

        return finalResult;
    }

    private String executePipeline(String collectionName, List<Object> pipelineStages, List<Document> results) {
        try {
            List<Bson> bsonPipeline = new ArrayList<>();
            if (pipelineStages != null) {
                for (Object stage : pipelineStages) {
                    String stageJson = objectMapper.writeValueAsString(stage);
                    bsonPipeline.add(Document.parse(stageJson));
                }
            }
            mongoTemplate.getCollection(collectionName)
                    .aggregate(bsonPipeline)
                    .into(results);
            return null; // success
        } catch (Exception e) {
            System.err.println("Error al ejecutar agregación dinámica en MongoDB: " + e.getMessage());
            return e.getMessage();
        }
     }
}
