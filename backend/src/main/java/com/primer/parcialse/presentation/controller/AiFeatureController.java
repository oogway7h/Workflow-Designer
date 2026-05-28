package com.primer.parcialse.presentation.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.primer.parcialse.application.dto.ai.NlpIntentRequestDTO;
import com.primer.parcialse.application.dto.ai.ModifyDiagramRequestDTO;
import com.primer.parcialse.application.dto.ai.NlpIntentResponseDTO;
import com.primer.parcialse.application.dto.ai.NlpNavigateRequestDTO;
import com.primer.parcialse.application.dto.ai.NlpNavigateResponseDTO;
import com.primer.parcialse.application.dto.ai.NlpFillFormRequestDTO;
import com.primer.parcialse.application.dto.ai.NlpFillFormResponseDTO;
import com.primer.parcialse.application.dto.ai.AssistantRequestDTO;
import com.primer.parcialse.application.dto.ai.AssistantResponseDTO;
import com.primer.parcialse.application.dto.ai.BottleneckResponseDTO;
import com.primer.parcialse.application.dto.ai.GeneratePolicyRequestDTO;
import com.primer.parcialse.application.dto.policy.PolicyDiagramDTO;
import com.primer.parcialse.application.service.AiIntegrationService;
import com.primer.parcialse.application.service.DepartmentService;
import com.primer.parcialse.application.service.PolicyService;
import com.primer.parcialse.application.service.WorkflowAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/workflows")
@RequiredArgsConstructor
public class AiFeatureController {

    private final AiIntegrationService aiIntegrationService;
    private final WorkflowAnalyticsService workflowAnalyticsService;
    private final PolicyService policyService;
    private final DepartmentService departmentService;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/ai/chat")
    public ResponseEntity<AssistantResponseDTO> chat(@RequestBody AssistantRequestDTO request) {
        return ResponseEntity.ok(aiIntegrationService.getAssistantSuggestion(request));
    }

    @PostMapping("/ai/generate-policy")
    // @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<?> generatePolicy(@RequestBody AssistantRequestDTO request) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            String policyId = null;

            Object currentDiagramJson = null;
            if (request.getScreenData() != null && !request.getScreenData().isEmpty()) {
                JsonNode screenDataNode = mapper.readTree(request.getScreenData());
                if (screenDataNode.has("activePolicyId")) {
                    policyId = screenDataNode.get("activePolicyId").asText();
                }
                if (screenDataNode.has("currentDiagramJson")) {
                    currentDiagramJson = mapper.treeToValue(screenDataNode.get("currentDiagramJson"), Object.class);
                }
            }

            if (policyId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Debe tener una política abierta para generar o modificar un diagrama. Por favor, cree o seleccione una política primero."));
            }

            GeneratePolicyRequestDTO genRequest = new GeneratePolicyRequestDTO();
            genRequest.setPrompt(request.getUserMessage());
            genRequest.setDepartments(departmentService.getAll());
            if (currentDiagramJson != null) {
                genRequest.setCurrentDiagramJson(currentDiagramJson);
            }

            Object iaGeneratedJsonResponse = aiIntegrationService.generatePolicy(genRequest);

            if (policyId != null) {
                PolicyDiagramDTO diagramDTO = mapper.convertValue(iaGeneratedJsonResponse, PolicyDiagramDTO.class);

                // Auto-Layout: Asignar coordenadas a lanes y nodos
                if (diagramDTO.getLanes() != null) {
                    double currentX = 0;
                    for (var lane : diagramDTO.getLanes()) {
                        lane.setX(currentX);
                        lane.setWidth(250.0);
                        currentX += 250.0;
                    }
                }

                if (diagramDTO.getActivityNodes() != null) {
                    double currentY = 50.0;
                    for (var node : diagramDTO.getActivityNodes()) {
                        double nodeX = 50.0;
                        if (diagramDTO.getLanes() != null && node.getLaneId() != null) {
                            for (var lane : diagramDTO.getLanes()) {
                                if (lane.getId() != null && lane.getId().equals(node.getLaneId())) {
                                    // Centrar nodo (asumiendo width 176) en el carril (width 250)
                                    nodeX = lane.getX() + 37.0;
                                    break;
                                }
                            }
                        }
                        node.setX(nodeX);
                        node.setY(currentY);
                        currentY += 120.0;
                    }
                }

                policyService.updateDiagram(policyId, diagramDTO);

                messagingTemplate.convertAndSend("/topic/policy/" + policyId,
                        Map.of(
                                "type", "DIAGRAM_UPDATED",
                                "payload", diagramDTO));
            }

            return ResponseEntity.ok(new AssistantResponseDTO("¡He generado y guardado la política con éxito!"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    @PostMapping("/ai/modify-diagram")
    public ResponseEntity<?> modifyDiagram(@RequestBody AssistantRequestDTO request) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            String policyId = null;

            Object currentDiagramJson = null;
            if (request.getScreenData() != null && !request.getScreenData().isEmpty()) {
                JsonNode screenDataNode = mapper.readTree(request.getScreenData());
                if (screenDataNode.has("activePolicyId")) {
                    policyId = screenDataNode.get("activePolicyId").asText();
                }
                if (screenDataNode.has("currentDiagramJson")) {
                    currentDiagramJson = mapper.treeToValue(screenDataNode.get("currentDiagramJson"), Object.class);
                }
            }

            if (policyId != null && currentDiagramJson == null) {
                try {
                    var policy = policyService.getByUuid(policyId);
                    Map<String, Object> diagram = new java.util.LinkedHashMap<>();
                    diagram.put("name", policy.getName());
                    diagram.put("description", policy.getDescription());
                    diagram.put("managerId", policy.getManagerId());
                    diagram.put("ownerId", policy.getOwnerId());
                    diagram.put("activityNodes", policy.getActivityNodes() != null ? policy.getActivityNodes() : new java.util.ArrayList<>());
                    diagram.put("transitions", policy.getTransitions() != null ? policy.getTransitions() : new java.util.ArrayList<>());
                    diagram.put("lanes", policy.getLanes() != null ? policy.getLanes() : new java.util.ArrayList<>());
                    currentDiagramJson = diagram;
                } catch (Exception e) {
                    // Ignore, it will fail in the next check if policy wasn't found
                }
            }

            if (policyId == null || currentDiagramJson == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Debe tener una política abierta y un diagrama existente para poder modificarlo."));
            }

            ModifyDiagramRequestDTO modRequest = new ModifyDiagramRequestDTO();
            modRequest.setPrompt(request.getUserMessage());
            modRequest.setDepartments(departmentService.getAll());
            modRequest.setCurrentDiagramJson(currentDiagramJson);

            Object iaGeneratedJsonResponse = aiIntegrationService.modifyDiagram(modRequest);

            PolicyDiagramDTO diagramDTO = mapper.convertValue(iaGeneratedJsonResponse, PolicyDiagramDTO.class);
            
            policyService.updateDiagram(policyId, diagramDTO);

            messagingTemplate.convertAndSend("/topic/policy/" + policyId,
                    Map.of(
                            "type", "DIAGRAM_UPDATED",
                            "payload", diagramDTO));

            return ResponseEntity.ok(Map.of(
                    "reply", "¡He modificado y guardado el diagrama con éxito!",
                    "generated_diagram", iaGeneratedJsonResponse
            ));
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Error al procesar screenData: " + e.getMessage()));
        } catch (com.primer.parcialse.domain.exception.AiServiceUnavailableException e) {
            return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    @GetMapping("/policies/{policyId}/analytics")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DESIGNER')")
    public ResponseEntity<BottleneckResponseDTO> generateAnalytics(@PathVariable String policyId) {
        BottleneckResponseDTO response = workflowAnalyticsService.generatePolicyAnalytics(policyId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ai/nlp/intent")
    public ResponseEntity<NlpIntentResponseDTO> nlpIntent(@RequestBody NlpIntentRequestDTO request) {
        return ResponseEntity.ok(aiIntegrationService.nlpIntent(request));
    }

    @PostMapping("/ai/nlp/navigate")
    public ResponseEntity<NlpNavigateResponseDTO> nlpNavigate(@RequestBody NlpNavigateRequestDTO request) {
        return ResponseEntity.ok(aiIntegrationService.nlpNavigate(request));
    }

    @PostMapping("/ai/nlp/fill-form")
    public ResponseEntity<NlpFillFormResponseDTO> nlpFillForm(@RequestBody NlpFillFormRequestDTO request) {
        return ResponseEntity.ok(aiIntegrationService.nlpFillForm(request));
    }
}
