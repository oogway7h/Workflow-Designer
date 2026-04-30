package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.dto.policy.HistoryTimelineDTO;
import com.primer.parcialse.application.dto.policy.InstanceDetailDTO;
import com.primer.parcialse.application.dto.policy.InstanceSummaryDTO;
import com.primer.parcialse.application.dto.policy.PendingTaskDTO;
import com.primer.parcialse.application.dto.policy.EmployeeDashboardDTO;
import com.primer.parcialse.application.service.WorkflowService;
import com.primer.parcialse.domain.model.PolicyInstance;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowService workflowService;

    @PostMapping("/start")
    public ResponseEntity<PolicyInstance> startInstance(
            @RequestParam String policyUuid,
            @RequestParam String managerId) {

        PolicyInstance instance = workflowService.startInstance(policyUuid, managerId);
        return ResponseEntity.ok(instance);
    }

    @PostMapping("/{instanceUuid}/complete")
    public ResponseEntity<PolicyInstance> completeTask(
            @PathVariable String instanceUuid,
            @RequestParam String assigneeId,
            @RequestBody TaskCompletionRequest request) {

        PolicyInstance updatedInstance = workflowService.completeTask(instanceUuid, assigneeId, request.getTaskData());
        return ResponseEntity.ok(updatedInstance);
    }

    @PreAuthorize("hasRole('EMPLOYEE')")
    @GetMapping("/tasks/pending")
    public ResponseEntity<List<PendingTaskDTO>> getPendingTasks() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(workflowService.getPendingTasks(username));
    }

    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/instances/managed")
    public ResponseEntity<List<InstanceSummaryDTO>> getManagedInstances(
            @RequestParam(required = false) String status) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(workflowService.getManagedInstances(username, status));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/instances")
    public ResponseEntity<Page<InstanceSummaryDTO>> getAllInstances(Pageable pageable) {
        return ResponseEntity.ok(workflowService.getAllInstances(pageable));
    }

    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @GetMapping("/instances/{instanceUuid}")
    public ResponseEntity<InstanceDetailDTO> getInstanceDetails(@PathVariable String instanceUuid) {
        return ResponseEntity.ok(workflowService.getInstanceDetails(instanceUuid));
    }

    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER')")
    @PostMapping("/tasks/{instanceUuid}/complete")
    public ResponseEntity<PolicyInstance> completeEmployeeTask(
            @PathVariable String instanceUuid,
            @RequestBody TaskCompletionRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        PolicyInstance updatedInstance = workflowService.completeEmployeeTask(instanceUuid, username,
                request.getTaskData());
        return ResponseEntity.ok(updatedInstance);
    }

    @PreAuthorize("hasRole('EMPLOYEE')")
    @GetMapping("/dashboard/employee")
    public ResponseEntity<EmployeeDashboardDTO> getEmployeeDashboard() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(workflowService.getEmployeeDashboard(username));
    }

    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @GetMapping("/instances/{instanceUuid}/history")
    public ResponseEntity<List<HistoryTimelineDTO>> getInstanceHistory(@PathVariable String instanceUuid) {
        return ResponseEntity.ok(workflowService.getInstanceHistory(instanceUuid));
    }

    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
    @GetMapping("/history")
    public ResponseEntity<List<HistoryTimelineDTO>> getHistory(
            @RequestParam(required = false) String status) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(workflowService.getHistory(username, status));
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @PostMapping("/external/start")
    public ResponseEntity<PolicyInstance> startExternalInstance(
            @RequestParam String policyUuid) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        PolicyInstance instance = workflowService.startExternalInstance(policyUuid, username);
        return ResponseEntity.ok(instance);
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/customer/my-instances")
    public ResponseEntity<List<InstanceSummaryDTO>> getCustomerInstances() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(workflowService.getCustomerInstances(username));
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    @GetMapping("/customer/instances/{instanceUuid}/track")
    public ResponseEntity<List<HistoryTimelineDTO>> getCustomerInstanceTrack(@PathVariable String instanceUuid) {
        return ResponseEntity.ok(workflowService.getInstanceHistory(instanceUuid));
    }

    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/instances/incoming")
    public ResponseEntity<List<InstanceSummaryDTO>> getIncomingInstances() {
        return ResponseEntity.ok(workflowService.getIncomingInstances());
    }

    @PreAuthorize("hasRole('MANAGER')")
    @PatchMapping("/instances/{instanceUuid}/claim")
    public ResponseEntity<PolicyInstance> claimInstance(@PathVariable String instanceUuid) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        PolicyInstance instance = workflowService.claimInstance(instanceUuid, username);
        return ResponseEntity.ok(instance);
    }

    @Data
    public static class TaskCompletionRequest {
        private Map<String, Object> taskData;
    }
}
