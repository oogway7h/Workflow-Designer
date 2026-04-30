package com.primer.parcialse.application.dto.policy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingTaskDTO {
    private String instanceId;
    private String policyName;
    private String taskName;
    private Instant createdAt;
    private String managerName;
}
