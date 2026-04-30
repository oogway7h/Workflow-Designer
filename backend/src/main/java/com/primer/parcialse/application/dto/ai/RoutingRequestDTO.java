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
public class RoutingRequestDTO {
    @JsonProperty("task_name")
    private String taskName;
    private List<CandidateDTO> candidates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CandidateDTO {
        @JsonProperty("candidate_id")
        private String candidateId;
        @JsonProperty("current_pending_tasks")
        private int currentPendingTasks;
        @JsonProperty("avg_completion_hours_history")
        private double avgCompletionHoursHistory;
    }
}
