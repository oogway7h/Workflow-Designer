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
public class InstanceSummaryDTO {
    private String instanceId;
    private String policyName;
    private String status;
    private String currentTask;
    private Instant startedAt;
}
