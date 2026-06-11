package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.service.PolicyService;
import com.primer.parcialse.application.service.UserService;
import com.primer.parcialse.application.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
public class ExportController {

    private final PolicyService policyService;
    private final UserService userService;
    private final WorkflowService workflowService;

    @GetMapping("/training-data")
    // Note: Can be restricted to ADMIN or specific AI service roles in production
    public ResponseEntity<Map<String, Object>> getTrainingData() {
        Map<String, Object> data = new HashMap<>();
        data.put("policies", policyService.getAll());
        data.put("users", userService.getAll());
        data.put("instances", workflowService.getAllInstances(Pageable.unpaged()).getContent());
        return ResponseEntity.ok(data);
    }
}
