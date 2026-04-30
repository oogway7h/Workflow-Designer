package com.primer.parcialse.application.dto.policy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstanceDetailDTO {
    private String instanceId;
    private String policyName;
    private String status;
    private String currentTaskId;
    private String currentTaskName;
    private String currentTaskAssigneeName;
    private Map<String, Object> formSchemaJson;
    private Map<String, Object> instanceData;
    private Instant startedAt;
    private Instant updatedAt;
}
