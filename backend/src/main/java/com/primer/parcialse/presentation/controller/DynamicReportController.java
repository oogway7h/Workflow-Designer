package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.service.NlpQueryCompilerService;
import com.primer.parcialse.application.service.ReportGenerationService;
import com.primer.parcialse.application.dto.report.ReportGenerateRequestDTO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class DynamicReportController {

    private final NlpQueryCompilerService nlpQueryCompilerService;
    private final ReportGenerationService reportGenerationService;

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'EMPLOYEE', 'DESIGNER')")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> generateReport(
            @RequestBody ReportGenerateRequestDTO requestBody,
            HttpServletRequest httpServletRequest) {

        String prompt = requestBody.getPrompt();
        String format = requestBody.getFormat() != null ? requestBody.getFormat() : "pdf";

        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "El prompt no puede estar vacío"));
        }

        try {
            // 1. Ejecutar la compilación del query NLP y extraer datos brutos + KPIs + columnas
            Map<String, Object> compiledReport = nlpQueryCompilerService.compileAndExecuteReport(prompt);

            String title = (String) compiledReport.get("title");
            String description = (String) compiledReport.get("description");
            List<Map<String, Object>> columns = (List<Map<String, Object>>) compiledReport.get("columns");
            List<Map<String, Object>> data = (List<Map<String, Object>>) compiledReport.get("data");

            // 2. Determinar el Base URL de backend dinámicamente
            String scheme = httpServletRequest.getScheme();
            String serverName = httpServletRequest.getServerName();
            int serverPort = httpServletRequest.getServerPort();
            String contextPath = httpServletRequest.getContextPath();
            String backendBaseUrl = scheme + "://" + serverName + ":" + serverPort + contextPath;

            // 3. Generar el documento en caliente y guardarlo (en S3 o en caché local)
            String downloadUrl = reportGenerationService.generateAndSaveReport(
                    title != null ? title : "Reporte Dinámico",
                    description != null ? description : "",
                    columns,
                    data,
                    format,
                    backendBaseUrl,
                    (Map<String, Object>) compiledReport.get("chart")
            );

            // 4. Construir respuesta final
            Map<String, Object> response = new HashMap<>();
            response.put("title", title);
            response.put("description", description);
            response.put("downloadUrl", downloadUrl);
            response.put("kpis", compiledReport.get("kpis"));
            response.put("columns", columns);
            response.put("data", data);
            if (compiledReport.containsKey("chart")) {
                response.put("chart", compiledReport.get("chart"));
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Error al procesar el reporte dinámico",
                    "error", e.getMessage() != null ? e.getMessage() : e.toString()
            ));
        }
    }

    @GetMapping("/download/{key}")
    public ResponseEntity<byte[]> downloadReport(@PathVariable String key) {
        byte[] fileBytes = reportGenerationService.getCachedFile(key);
        String contentType = reportGenerationService.getCachedContentType(key);

        if (fileBytes == null) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (contentType != null) {
            try {
                mediaType = MediaType.parseMediaType(contentType);
            } catch (Exception e) {
                // Ignore
            }
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + key + "\"")
                .body(fileBytes);
    }
}
