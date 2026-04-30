package com.primer.parcialse.presentation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.primer.parcialse.application.dto.ai.AssistantRequestDTO;
import com.primer.parcialse.application.dto.ai.AssistantResponseDTO;
import com.primer.parcialse.application.dto.ai.BottleneckResponseDTO;
import com.primer.parcialse.application.service.AiIntegrationService;
import com.primer.parcialse.application.service.WorkflowAnalyticsService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.data.mongodb.uri=mongodb://localhost:27017/workflow_test_db"
})
public class AiFeatureControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiIntegrationService aiIntegrationService;

    @MockBean
    private WorkflowAnalyticsService workflowAnalyticsService;

    @BeforeEach
    void setUp() {
        AssistantResponseDTO assistantResponse = AssistantResponseDTO.builder()
                .reply("Esta es una sugerencia simulada por IA para el contexto de la prueba de integracion.")
                .build();

        when(aiIntegrationService.getAssistantSuggestion(any())).thenReturn(assistantResponse);

        BottleneckResponseDTO bottleneckResponse = BottleneckResponseDTO.builder()
                .bottlenecks(List.of("revisar justificacion tecnica demora un 50% mas de lo esperado."))
                .recommendations(List.of("Capacitar o automatizar paso 3.", "Estandarizar formatos."))
                .build();

        when(workflowAnalyticsService.generatePolicyAnalytics(eq("policy-123"))).thenReturn(bottleneckResponse);
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = { "ADMIN" })
    void postChatShouldReturnSuggestion() throws Exception {
        AssistantRequestDTO request = AssistantRequestDTO.builder()
                .userRole("ADMIN")
                .currentScreen("Pantalla de creacion de politicas")
                .userMessage("¿Qué nodos agregar?")
                .screenData("{}")
                .build();

        mockMvc.perform(post("/api/v1/workflows/ai/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").exists())
                .andExpect(jsonPath("$.reply")
                        .value("Esta es una sugerencia simulada por IA para el contexto de la prueba de integracion."));
    }

    @Test
    @WithMockUser(username = "manager@test.com", roles = { "MANAGER" })
    void getAnalyticsShouldReturnBottleneckData() throws Exception {
        mockMvc.perform(get("/api/v1/workflows/policies/policy-123/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bottlenecks").isArray())
                .andExpect(jsonPath("$.bottlenecks[0]")
                        .value("revisar justificacion tecnica demora un 50% mas de lo esperado."))
                .andExpect(jsonPath("$.recommendations").isArray())
                .andExpect(jsonPath("$.recommendations[0]").value("Capacitar o automatizar paso 3."));
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = { "USER" })
    void getAnalyticsWithUserRoleShouldReturnForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/workflows/policies/policy-123/analytics"))
                .andExpect(status().isForbidden());
    }
}