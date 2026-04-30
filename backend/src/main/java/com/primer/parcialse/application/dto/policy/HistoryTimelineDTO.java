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
public class HistoryTimelineDTO {
    private String instanceId;
    private String taskName;
    private String action;
    private String completedBy;
    private Instant timestamp;
}
