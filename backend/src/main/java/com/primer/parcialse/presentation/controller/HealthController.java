package com.primer.parcialse.presentation.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Controlador de Health Check.
 * Endpoint público para verificar que la API está activa.
 * GET /api/v1/health
 */
@RestController
@RequestMapping("/api/v1")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "workflow-engine",
                "timestamp", Instant.now().toString(),
                "message", "API is alive and connected to MongoDB"
        ));
    }
}
