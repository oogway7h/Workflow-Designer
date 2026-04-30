package com.primer.parcialse.application.dto.policy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDashboardDTO {
    private long pendingTasksCount;
    private long completedTasksCount;
    private List<HistoryTimelineDTO> recentCompletedTasks;
}