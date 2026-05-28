package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.dto.document.DocumentAuditResponseDTO;
import com.primer.parcialse.application.dto.document.DocumentResponseDTO;
import com.primer.parcialse.application.dto.document.DocumentUploadResponseDTO;
import com.primer.parcialse.application.service.DocumentAuditService;
import com.primer.parcialse.application.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Tag(name = "Document Management", description = "Endpoints for managing files and document versioning")
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentAuditService documentAuditService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a document")
    public ResponseEntity<DocumentUploadResponseDTO> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "policyId", required = false) String policyId,
            @RequestParam(value = "customerId", required = false) String customerId) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = auth != null ? auth.getName() : "anonymous";
            // In a real scenario we extract UUID and Name from DB using userEmail
            // Using placeholder for now
            String userId = "current-user-uuid"; 
            String userName = userEmail;

            DocumentResponseDTO doc = documentService.upload(file, policyId, customerId, userId, userName);
            
            DocumentUploadResponseDTO response = DocumentUploadResponseDTO.builder()
                    .uuid(doc.getUuid())
                    .fileName(doc.getFileName())
                    .message("Document uploaded successfully")
                    .build();
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    @Operation(summary = "Get all documents")
    public ResponseEntity<List<DocumentResponseDTO>> getAll() {
        return ResponseEntity.ok(documentService.getAll());
    }

    @GetMapping("/policy/{policyId}")
    @Operation(summary = "Get documents by policy repository")
    public ResponseEntity<List<DocumentResponseDTO>> getByPolicy(@PathVariable String policyId) {
        return ResponseEntity.ok(documentService.getByPolicy(policyId));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get documents by customer repository")
    public ResponseEntity<List<DocumentResponseDTO>> getByCustomer(@PathVariable String customerId) {
        return ResponseEntity.ok(documentService.getByCustomer(customerId));
    }

    @GetMapping("/{uuid}/download")
    @Operation(summary = "Download a document")
    public ResponseEntity<Resource> download(
            @PathVariable String uuid,
            @RequestParam(value = "version", required = false) Integer version) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = auth != null ? auth.getName() : "anonymous";
        String userId = "current-user-uuid";
        String userName = userEmail;

        byte[] data = documentService.download(uuid, version, userId, userName);
        
        // Find document details to get content type (would usually fetch DTO here instead)
        // This is a simplified approach
        ByteArrayResource resource = new ByteArrayResource(data);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"document\"")
                .contentLength(data.length)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @GetMapping("/{uuid}/url")
    @Operation(summary = "Get a presigned URL to view a document")
    public ResponseEntity<Map<String, String>> getPresignedUrl(
            @PathVariable String uuid,
            @RequestParam(value = "version", required = false) Integer version) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = auth != null ? auth.getName() : "anonymous";
        String userId = "current-user-uuid";
        String userName = userEmail;

        String url = documentService.getPresignedUrl(uuid, version, userId, userName);
        
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/{uuid}")
    @Operation(summary = "Delete a document")
    public ResponseEntity<Void> delete(@PathVariable String uuid) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = auth != null ? auth.getName() : "anonymous";
        String userId = "current-user-uuid";
        String userName = userEmail;

        documentService.delete(uuid, userId, userName);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/{uuid}/audit")
    @Operation(summary = "Get audit logs for a specific document")
    public ResponseEntity<List<com.primer.parcialse.domain.model.DocumentAudit>> getAuditLogs(@PathVariable String uuid) {
        return ResponseEntity.ok(documentAuditService.getByDocumentId(uuid));
    }

    @GetMapping("/audit/recent")
    @Operation(summary = "Get recent audit logs across all documents")
    public ResponseEntity<List<com.primer.parcialse.domain.model.DocumentAudit>> getRecentAuditLogs() {
        return ResponseEntity.ok(documentAuditService.getRecentAudits());
    }
}
