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
public class AutoAssignPolicyResponseDTO {

    private List<ActivityAssignmentDTO> assignments;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityAssignmentDTO {
        @JsonProperty("activity_uuid")
        private String activityUuid;
        @JsonProperty("employee_uuid")
        private String employeeUuid;
        private String justification;
    }
}
