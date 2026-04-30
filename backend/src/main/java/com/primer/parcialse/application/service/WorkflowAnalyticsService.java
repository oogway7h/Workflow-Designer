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
import java.util.stream.Collectors;

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
}
