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
public class AutoAssignPolicyRequestDTO {

    @JsonProperty("policy_name")
    private String policyName;

    private List<ActivityInfoDTO> activities;
    private List<EmployeeInfoDTO> employees;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityInfoDTO {
        private String uuid;
        private String name;
        private String description;
        @JsonProperty("lane_id")
        private String laneId;
        @JsonProperty("lane_name")
        private String laneName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeInfoDTO {
        private String uuid;
        private String name;
        @JsonProperty("role_name")
        private String roleName;
        @JsonProperty("current_pending_tasks")
        private int currentPendingTasks;
        @JsonProperty("avg_completion_hours")
        private double avgCompletionHours;
    }
}
