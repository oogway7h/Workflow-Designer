package com.primer.parcialse.presentation.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.primer.parcialse.application.dto.ai.NlpIntentRequestDTO;
import com.primer.parcialse.application.dto.ai.ModifyDiagramRequestDTO;
import com.primer.parcialse.application.dto.ai.NlpIntentResponseDTO;
import com.primer.parcialse.application.dto.ai.RouteIntentRequestDTO;
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

import java.util.List;
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
        try {
            List<com.primer.parcialse.application.dto.policy.PolicyResponseDTO> policies = policyService.getAll();
            StringBuilder contextBuilder = new StringBuilder();
            contextBuilder.append("\n[CONTEXT_POLICIES_DOCUMENTS]\n");
            contextBuilder.append("Trámites/Políticas disponibles y sus documentos requeridos:\n");
            for (var policy : policies) {
                if ("ACTIVE".equalsIgnoreCase(policy.getState())) {
                    contextBuilder.append("- Trámite: \"").append(policy.getName()).append("\"\n");
                    contextBuilder.append("  Descripción: ").append(policy.getDescription()).append("\n");
                    boolean hasDocs = false;
                    if (policy.getActivityNodes() != null) {
                        for (var node : policy.getActivityNodes()) {
                            if (Boolean.TRUE.equals(node.getAllowFileUpload()) && node.getRequiredDocuments() != null && !node.getRequiredDocuments().isEmpty()) {
                                if (!hasDocs) {
                                    contextBuilder.append("  Documentos requeridos por actividad:\n");
                                    hasDocs = true;
                                }
                                contextBuilder.append("    * Actividad \"").append(node.getName()).append("\": ");
                                for (int i = 0; i < node.getRequiredDocuments().size(); i++) {
                                    var reqDoc = node.getRequiredDocuments().get(i);
                                    contextBuilder.append(reqDoc.getName())
                                                 .append(" (")
                                                 .append(Boolean.TRUE.equals(reqDoc.getRequired()) ? "Obligatorio" : "Opcional")
                                                 .append(")");
                                    if (i < node.getRequiredDocuments().size() - 1) {
                                        contextBuilder.append(", ");
                                    }
                                }
                                contextBuilder.append("\n");
                            }
                        }
                    }
                    if (!hasDocs) {
                        contextBuilder.append("  Documentos requeridos: Ninguno.\n");
                    }
                }
            }
            String existingScreenData = request.getScreenData() != null ? request.getScreenData() : "";
            request.setScreenData(existingScreenData + contextBuilder.toString());
        } catch (Exception e) {
            System.err.println("Error appending policy document requirements to AI context: " + e.getMessage());
        }
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

    // --- Deep Learning Endpoints ---

    @PostMapping("/ai/dl/route-intent")
    public ResponseEntity<?> dlRouteIntent(@RequestBody RouteIntentRequestDTO request) {
        return ResponseEntity.ok(aiIntegrationService.routeIntent(request));
    }

    @GetMapping("/ai/dl/analyze-bottlenecks/{policyId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DESIGNER')")
    public ResponseEntity<?> dlAnalyzeBottlenecksForPolicy(@PathVariable String policyId) {
        return ResponseEntity.ok(workflowAnalyticsService.analyzePolicyBottlenecksDL(policyId));
    }

    @PostMapping("/ai/dl/suggest-policies")
    public ResponseEntity<?> dlSuggestPolicies(@RequestBody RouteIntentRequestDTO request) {
        try {
            Object predictionResult = aiIntegrationService.routeIntent(request);
            if (predictionResult instanceof Map) {
                Map<String, Object> predictionsMap = (Map<String, Object>) predictionResult;
                List<Map<String, Object>> allPredictions = (List<Map<String, Object>>) predictionsMap.get("all_predictions");
                
                List<Map<String, Object>> suggestions = new java.util.ArrayList<>();
                if (allPredictions != null) {
                    for (Map<String, Object> pred : allPredictions) {
                        String policyId = (String) pred.get("policy_id");
                        Double confidence = (Double) pred.get("confidence");
                        
                        try {
                            com.primer.parcialse.application.dto.policy.PolicyResponseDTO policy = policyService.getByUuid(policyId);
                            if (policy != null) {
                                Map<String, Object> suggestion = new java.util.HashMap<>();
                                suggestion.put("uuid", policy.getUuid());
                                suggestion.put("name", policy.getName());
                                suggestion.put("description", policy.getDescription());
                                suggestion.put("state", policy.getState());
                                suggestion.put("confidence", confidence);
                                suggestions.add(suggestion);
                            }
                        } catch (com.primer.parcialse.domain.exception.ResourceNotFoundException e) {
                            // Ignorar si la política no existe en DB
                        }
                    }
                }
                return ResponseEntity.ok(suggestions);
            }
            return ResponseEntity.ok(predictionResult);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/ai/dl/analyze-bottlenecks")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DESIGNER')")
    public ResponseEntity<?> dlAnalyzeBottlenecks(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(aiIntegrationService.analyzeBottlenecksDL(request));
    }

    @PostMapping("/ai/dl/best-route")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'DESIGNER')")
    public ResponseEntity<?> dlBestRoute(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(aiIntegrationService.findBestRoute(request));
    }

    @GetMapping("/ai/dl/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> dlStatus() {
        return ResponseEntity.ok(aiIntegrationService.getDlStatus());
    }

    @PostMapping("/ai/dl/train")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> dlTrain(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(aiIntegrationService.trainDlModels(request));
    }
}
