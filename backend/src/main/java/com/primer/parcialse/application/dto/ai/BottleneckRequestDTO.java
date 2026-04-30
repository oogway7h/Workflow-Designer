package com.primer.parcialse.application.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BottleneckRequestDTO {
    @JsonProperty("policy_name")
    private String policyName;
    @JsonProperty("total_instances_analyzed")
    private int totalInstancesAnalyzed;
    @JsonProperty("execution_metrics")
    private List<ExecutionMetricDTO> executionMetrics;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExecutionMetricDTO {
        @JsonProperty("task")
        private String taskName;
        @JsonProperty("avg_duration_hours")
        private double avgDurationHours;
        @JsonProperty("expected_duration_hours")
        private double expectedDurationHours;
    }
}
