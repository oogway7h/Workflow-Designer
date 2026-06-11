package com.primer.parcialse.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.primer.parcialse.application.service.NlpQueryCompilerService;
import com.primer.parcialse.application.service.ReportGenerationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.data.mongodb.uri=mongodb://localhost:27017/workflow_test_db"
})
public class DynamicReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private NlpQueryCompilerService nlpQueryCompilerService;

    @MockBean
    private ReportGenerationService reportGenerationService;

    @BeforeEach
    void setUp() throws Exception {
        Map<String, Object> compiledReport = new HashMap<>();
        compiledReport.put("title", "Reporte de Prueba");
        compiledReport.put("description", "Descripción de Prueba");
        compiledReport.put("columns", List.of(Map.of("key", "col1", "label", "Columna 1")));
        compiledReport.put("data", List.of(Map.of("col1", "valor1")));
        compiledReport.put("kpis", List.of(Map.of("title", "KPI 1", "value", "10", "format", "number")));

        when(nlpQueryCompilerService.compileAndExecuteReport(anyString())).thenReturn(compiledReport);

        when(reportGenerationService.generateAndSaveReport(
                anyString(), anyString(), any(), any(), anyString(), anyString(), any()
        )).thenReturn("http://localhost:8080/api/v1/reports/download/reporte_test.pdf");
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = { "ADMIN" })
    void generateReportWithAdminRoleShouldReturnOk() throws Exception {
        Map<String, String> request = Map.of("prompt", "Vacaciones del mes pasado", "format", "pdf");

        mockMvc.perform(post("/api/v1/reports/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Reporte de Prueba"))
                .andExpect(jsonPath("$.downloadUrl").value("http://localhost:8080/api/v1/reports/download/reporte_test.pdf"))
                .andExpect(jsonPath("$.kpis[0].value").value("10"));
    }

    @Test
    @WithMockUser(username = "designer@test.com", roles = { "DESIGNER" })
    void generateReportWithDesignerRoleShouldReturnOk() throws Exception {
        Map<String, String> request = Map.of("prompt", "Vacaciones del mes pasado", "format", "pdf");

        mockMvc.perform(post("/api/v1/reports/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "customer@test.com", roles = { "CUSTOMER" })
    void generateReportWithCustomerRoleShouldReturnForbidden() throws Exception {
        Map<String, String> request = Map.of("prompt", "Vacaciones del mes pasado", "format", "pdf");

        mockMvc.perform(post("/api/v1/reports/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
