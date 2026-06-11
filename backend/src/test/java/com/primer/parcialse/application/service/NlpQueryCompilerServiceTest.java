package com.primer.parcialse.application.service;

import com.primer.parcialse.application.service.AiIntegrationService;
import com.primer.parcialse.application.service.NlpQueryCompilerService;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.AggregateIterable;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NlpQueryCompilerServiceTest {

    @Mock
    private AiIntegrationService aiIntegrationService;

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private MongoCollection<Document> mongoCollection;

    @Mock
    private AggregateIterable<Document> aggregateIterable;

    @InjectMocks
    private NlpQueryCompilerService nlpQueryCompilerService;

    @Test
    void compileAndExecuteReportShouldTriggerAnalysisWhenPromptIsAnalytical() {
        // Prepare mock report schema returned from compileReport
        Map<String, Object> mockReportSchema = new HashMap<>();
        mockReportSchema.put("title", "Reporte de Cuello de Botella");
        mockReportSchema.put("description", "Descripción genérica");
        mockReportSchema.put("collection", "policy_instances");
        mockReportSchema.put("pipeline", List.of(Map.of("$match", Map.of("status", "COMPLETED"))));
        mockReportSchema.put("columns", List.of(Map.of("key", "col1", "label", "Columna 1")));
        mockReportSchema.put("kpis", List.of());

        when(aiIntegrationService.compileReport(anyMap())).thenReturn(mockReportSchema);

        // Mock MongoTemplate behavior
        when(mongoTemplate.getCollection("policy_instances")).thenReturn(mongoCollection);
        when(mongoCollection.aggregate(anyList())).thenReturn(aggregateIterable);
        
        // Mock the aggregation result iterator
        doAnswer(invocation -> {
            List<Document> target = invocation.getArgument(0);
            Document doc = new Document();
            doc.put("col1", "valor1");
            target.add(doc);
            return null;
        }).when(aggregateIterable).into(any(List.class));

        // Prepare mock analysis returned from analyzeReportData
        Map<String, Object> mockAnalysisResponse = Map.of("analysis", "Análisis detallado de IA sobre el presupuesto.");
        when(aiIntegrationService.analyzeReportData(anyMap())).thenReturn(mockAnalysisResponse);

        // Execute service under test with an analytical prompt
        String prompt = "por qué existe cuellos de botella en el presupuesto mensual";
        Map<String, Object> result = nlpQueryCompilerService.compileAndExecuteReport(prompt);

        // Verify analysis was triggered and description overwritten
        assertThat(result.get("description")).isEqualTo("Análisis detallado de IA sobre el presupuesto.");
        verify(aiIntegrationService).analyzeReportData(anyMap());
    }

    @Test
    void compileAndExecuteReportShouldNotTriggerAnalysisWhenPromptIsSimple() {
        // Prepare mock report schema returned from compileReport
        Map<String, Object> mockReportSchema = new HashMap<>();
        mockReportSchema.put("title", "Reporte de Solicitudes");
        mockReportSchema.put("description", "Descripción simple");
        mockReportSchema.put("collection", "policy_instances");
        mockReportSchema.put("pipeline", List.of(Map.of("$match", Map.of("status", "COMPLETED"))));
        mockReportSchema.put("columns", List.of(Map.of("key", "col1", "label", "Columna 1")));
        mockReportSchema.put("kpis", List.of());

        when(aiIntegrationService.compileReport(anyMap())).thenReturn(mockReportSchema);

        // Mock MongoTemplate behavior
        when(mongoTemplate.getCollection("policy_instances")).thenReturn(mongoCollection);
        when(mongoCollection.aggregate(anyList())).thenReturn(aggregateIterable);
        
        // Mock the aggregation result iterator
        doAnswer(invocation -> {
            List<Document> target = invocation.getArgument(0);
            Document doc = new Document();
            doc.put("col1", "valor1");
            target.add(doc);
            return null;
        }).when(aggregateIterable).into(any(List.class));

        // Execute service under test with a simple prompt
        String prompt = "Ver solicitudes de la semana";
        Map<String, Object> result = nlpQueryCompilerService.compileAndExecuteReport(prompt);

        // Verify description is not overwritten and analysis was not triggered
        assertThat(result.get("description")).isEqualTo("Descripción simple");
        verify(aiIntegrationService, never()).analyzeReportData(anyMap());
    }
}
