package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.ai.BottleneckRequestDTO;
import com.primer.parcialse.application.dto.ai.BottleneckResponseDTO;
import com.primer.parcialse.application.dto.ai.RoutingRequestDTO;
import com.primer.parcialse.application.dto.ai.RoutingResponseDTO;
import com.primer.parcialse.domain.model.ActivityNode;
import com.primer.parcialse.domain.model.HistoryItem;
import com.primer.parcialse.domain.model.Policy;
import com.primer.parcialse.domain.model.PolicyInstance;
import com.primer.parcialse.domain.model.User;
import com.primer.parcialse.infrastructure.repository.PolicyInstanceRepository;
import com.primer.parcialse.infrastructure.repository.PolicyRepository;
import com.primer.parcialse.infrastructure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class WorkflowAnalyticsService {

    private final UserRepository userRepository;
    private final PolicyInstanceRepository policyInstanceRepository;
    private final PolicyRepository policyRepository;
    private final AiIntegrationService aiIntegrationService;

    public void assignTaskIntelligently(String instanceId, String taskName, String targetLaneId) {
        List<User> candidates = userRepository.findByRoleId(targetLaneId);

        if (candidates == null || candidates.isEmpty()) {
            return;
        }

        List<RoutingRequestDTO.CandidateDTO> candidateDTOs = candidates.stream().map(c -> {
            int pending = policyInstanceRepository.findPendingTasks(c.getUuid(), targetLaneId).size();
            return RoutingRequestDTO.CandidateDTO.builder()
                    .candidateId(c.getUuid())
                    .currentPendingTasks(pending)
                    .avgCompletionHoursHistory(2.0)
                    .build();
        }).collect(Collectors.toList());

        RoutingRequestDTO req = RoutingRequestDTO.builder()
                .taskName(taskName)
                .candidates(candidateDTOs)
                .build();

        try {
            RoutingResponseDTO res = aiIntegrationService.getOptimalAssignee(req);
            if (res != null && res.getRecommendedCandidateId() != null) {
                policyInstanceRepository.findByUuid(instanceId).ifPresent(instance -> {
                    instance.setCurrentAssigneeId(res.getRecommendedCandidateId());
                    policyInstanceRepository.save(instance);
                });
            }
        } catch (Exception e) {
            // Silencio en caso de falla de AI para no romper el flujo natural
        }
    }

    public BottleneckResponseDTO generatePolicyAnalytics(String policyId) {
        Policy policy = policyRepository.findByUuid(policyId)
                .orElseThrow(() -> new RuntimeException("PolÃ­tica no encontrada"));
        List<PolicyInstance> completedInstances = policyInstanceRepository.findByPolicyIdAndStatus(policyId,
                "COMPLETED");

        List<BottleneckRequestDTO.ExecutionMetricDTO> metrics = new ArrayList<>();
        if (policy.getActivityNodes() != null) {
            for (ActivityNode node : policy.getActivityNodes()) {
                double simulatedAvgHrs = 0.0;

                // CÃ¡lculo del promedio base basado en las instancias completadas si existiera
                // el timestamp de forma coherente
                // Simulado basÃ¡ndonos en cuantas veces aparece
                long count = 0;
                long totalMins = 0;

                for (PolicyInstance instance : completedInstances) {
                    if (instance.getHistory() != null) {
                        for (HistoryItem h : instance.getHistory()) {
                            if (node.getUuid().equals(h.getActivityNodeId())) {
                                count++;
                                totalMins += (Math.random() * 120) + 15; // random simulation
                            }
                        }
                    }
                }

                if (count > 0) {
                    simulatedAvgHrs = (totalMins / (double) count) / 60.0;
                } else {
                    simulatedAvgHrs = Math.random() * 2 + 0.5;
                }

                metrics.add(BottleneckRequestDTO.ExecutionMetricDTO.builder()
                        .taskName(node.getName())
                        .avgDurationHours(Math.round(simulatedAvgHrs * 100.0) / 100.0)
                        .expectedDurationHours(8.0)
                        .build());
            }
        }

        BottleneckRequestDTO requestDTO = BottleneckRequestDTO.builder()
                .policyName(policy.getName() != null ? policy.getName() : policy.getDescription())
                .totalInstancesAnalyzed(completedInstances.size())
                .executionMetrics(metrics)
                .build();

        return aiIntegrationService.analyzeBottlenecks(requestDTO);
    }

    public List<Map<String, Object>> getActualExecutionItems(String policyId) {
        Policy policy = policyRepository.findByUuid(policyId)
                .orElseThrow(() -> new RuntimeException("Política no encontrada"));
        List<PolicyInstance> completedInstances = policyInstanceRepository.findByPolicyIdAndStatus(policyId, "COMPLETED");

        List<Map<String, Object>> items = new java.util.ArrayList<>();
        
        // Mapeo rápido de Node UUID -> Lane ID y Name
        Map<String, String> nodeToLaneMap = new java.util.HashMap<>();
        Map<String, String> nodeToNameMap = new java.util.HashMap<>();
        if (policy.getActivityNodes() != null) {
            for (ActivityNode node : policy.getActivityNodes()) {
                nodeToLaneMap.put(node.getUuid(), node.getLaneId());
                nodeToNameMap.put(node.getUuid(), node.getName());
            }
        }

        int instanceIndex = 1;
        for (PolicyInstance instance : completedInstances) {
            if (instance.getHistory() != null && !instance.getHistory().isEmpty()) {
                java.time.Instant previousTime = instance.getCreatedAt();
                
                for (HistoryItem step : instance.getHistory()) {
                    String nodeUuid = step.getActivityNodeId();
                    if (nodeUuid == null) continue;
                    
                    String laneId = nodeToLaneMap.getOrDefault(nodeUuid, "e6edcb81-4782-44f0-af6d-1e9e184c77ba");
                    String nodeName = nodeToNameMap.getOrDefault(nodeUuid, nodeUuid);
                    
                    java.time.Instant currentTime = step.getTimestamp();
                    double durationHours = 0.0;
                    if (currentTime != null && previousTime != null) {
                        long millis = java.time.Duration.between(previousTime, currentTime).toMillis();
                        durationHours = millis / 3600000.0;
                    }
                    
                    // Redondear a 1 decimal
                    durationHours = Math.round(durationHours * 10.0) / 10.0;
                    
                    // Obtener día de semana y hora de inicio de la tarea (usando el previousTime)
                    java.time.ZonedDateTime zdt = previousTime.atZone(java.time.ZoneId.systemDefault());
                    int dayOfWeek = zdt.getDayOfWeek().getValue() % 7; // Sunday=0, Monday=1, ...
                    int hourOfDay = zdt.getHour();
                    
                    Map<String, Object> item = new java.util.HashMap<>();
                    item.put("department_id", laneId);
                    item.put("day_of_week", dayOfWeek);
                    item.put("hour_of_day", hourOfDay);
                    item.put("duration_hours", durationHours);
                    item.put("task_id", nodeName);
                    
                    String shortUuid = instance.getUuid() != null && instance.getUuid().length() >= 8 ?
                        instance.getUuid().substring(0, 8) : "default";
                    item.put("instance_id", "Trámite #" + instanceIndex + " (" + shortUuid + ")");
                    
                    items.add(item);
                    
                    previousTime = currentTime;
                }
            }
            instanceIndex++;
        }
        
        return items;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> analyzePolicyBottlenecksDL(String policyId) {
        List<Map<String, Object>> items = getActualExecutionItems(policyId);
        if (items.isEmpty()) {
            return new ArrayList<>();
        }

        Map<String, Object> reqBody = new HashMap<>();
        reqBody.put("items", items);

        Object rawResponse = aiIntegrationService.analyzeBottlenecksDL(reqBody);

        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> resMap = mapper.convertValue(rawResponse, Map.class);
        List<Map<String, Object>> results = (List<Map<String, Object>>) resMap.get("results");

        List<Map<String, Object>> mappedResults = new ArrayList<>();
        if (results != null) {
            for (Map<String, Object> r : results) {
                int itemIndex = ((Number) r.get("item_index")).intValue();
                Map<String, Object> inputItem = items.get(itemIndex);

                Map<String, Object> mapped = new HashMap<>();
                mapped.put("item_index", itemIndex);
                mapped.put("reconstruction_error", r.get("reconstruction_error"));
                mapped.put("is_anomaly", r.get("is_anomaly"));
                mapped.put("risk_score", r.get("risk_score"));

                mapped.put("task_name", inputItem.get("task_id"));
                mapped.put("department_id", inputItem.get("department_id"));
                mapped.put("duration_hours", inputItem.get("duration_hours"));
                mapped.put("instance_id", inputItem.get("instance_id"));

                mappedResults.add(mapped);
            }
        }

        return mappedResults;
    }
}
