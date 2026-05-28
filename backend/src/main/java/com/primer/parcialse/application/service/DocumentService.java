package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.document.DocumentAuditResponseDTO;
import com.primer.parcialse.application.dto.document.DocumentResponseDTO;
import com.primer.parcialse.domain.model.DocumentAudit;
import com.primer.parcialse.domain.model.DocumentEntity;
import com.primer.parcialse.domain.model.DocumentVersion;
import com.primer.parcialse.infrastructure.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final S3StorageService s3StorageService;
    private final DocumentAuditService documentAuditService;
    private final SimpMessagingTemplate messagingTemplate;

    public DocumentResponseDTO upload(MultipartFile file, String policyId, String customerId, String userId, String userName) throws IOException {
        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.isEmpty()) {
            throw new IllegalArgumentException("File name cannot be empty");
        }

        String folder = policyId != null ? "policies/" + policyId : (customerId != null ? "customers/" + customerId : "general");
        String s3Key = s3StorageService.upload(file, folder);

        // Check if document already exists to create a new version
        Optional<DocumentEntity> existingDocOpt = documentRepository.findAll().stream()
                .filter(d -> fileName.equals(d.getFileName()) && 
                        ((policyId != null && policyId.equals(d.getPolicyId())) || 
                         (customerId != null && customerId.equals(d.getCustomerId()))))
                .findFirst();

        DocumentEntity document;
        if (existingDocOpt.isPresent()) {
            document = existingDocOpt.get();
            int newVersionNumber = document.getCurrentVersion() + 1;
            
            DocumentVersion newVersion = new DocumentVersion();
            newVersion.setVersionNumber(newVersionNumber);
            newVersion.setS3Key(s3Key);
            newVersion.setFileSizeBytes(file.getSize());
            newVersion.setUploadedAt(Instant.now());
            newVersion.setUploadedByUserId(userId);
            
            document.getVersions().add(newVersion);
            document.setCurrentVersion(newVersionNumber);
            document.setUpdatedAt(Instant.now());
        } else {
            document = new DocumentEntity();
            document.setUuid(UUID.randomUUID().toString());
            document.setFileName(fileName);
            document.setContentType(file.getContentType());
            document.setPolicyId(policyId);
            document.setCustomerId(customerId);
            document.setUploadedByUserId(userId);
            document.setCreatedAt(Instant.now());
            document.setUpdatedAt(Instant.now());
            document.setCurrentVersion(1);
            
            DocumentVersion v1 = new DocumentVersion();
            v1.setVersionNumber(1);
            v1.setS3Key(s3Key);
            v1.setFileSizeBytes(file.getSize());
            v1.setUploadedAt(Instant.now());
            v1.setUploadedByUserId(userId);
            
            document.setVersions(new ArrayList<>());
            document.getVersions().add(v1);
        }

        document = documentRepository.save(document);

        documentAuditService.logAction(document.getUuid(), fileName, userId, userName, "UPLOAD", "Uploaded version " + document.getCurrentVersion());

        if (policyId != null) {
            messagingTemplate.convertAndSend("/topic/documents/" + policyId, "UPDATE");
        }

        return toDto(document, userName); // Note: Should ideally fetch user name from DB or use the one provided
    }

    public byte[] download(String uuid, Integer version, String userId, String userName) {
        DocumentEntity document = documentRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        DocumentVersion docVersion = document.getVersions().stream()
                .filter(v -> version == null ? v.getVersionNumber().equals(document.getCurrentVersion()) : v.getVersionNumber().equals(version))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Version not found"));

        byte[] data = s3StorageService.download(docVersion.getS3Key());

        documentAuditService.logAction(document.getUuid(), document.getFileName(), userId, userName, "DOWNLOAD", "Downloaded version " + docVersion.getVersionNumber());

        return data;
    }

    public String getPresignedUrl(String uuid, Integer version, String userId, String userName) {
        DocumentEntity document = documentRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        DocumentVersion docVersion = document.getVersions().stream()
                .filter(v -> version == null ? v.getVersionNumber().equals(document.getCurrentVersion()) : v.getVersionNumber().equals(version))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Version not found"));

        String url = s3StorageService.generatePresignedUrl(docVersion.getS3Key());

        documentAuditService.logAction(document.getUuid(), document.getFileName(), userId, userName, "VIEW", "Generated presigned URL for version " + docVersion.getVersionNumber());

        return url;
    }

    public void delete(String uuid, String userId, String userName) {
        DocumentEntity document = documentRepository.findByUuid(uuid)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        for (DocumentVersion version : document.getVersions()) {
            s3StorageService.delete(version.getS3Key());
        }

        documentRepository.deleteByUuid(uuid);

        documentAuditService.logAction(document.getUuid(), document.getFileName(), userId, userName, "DELETE", "Deleted document and all its versions");

        if (document.getPolicyId() != null) {
            messagingTemplate.convertAndSend("/topic/documents/" + document.getPolicyId(), "UPDATE");
        }
    }

    public List<DocumentResponseDTO> getByPolicy(String policyId) {
        return documentRepository.findByPolicyId(policyId).stream()
                .map(d -> toDto(d, "Unknown")) // Note: Should ideally map usernames properly
                .collect(Collectors.toList());
    }

    public List<DocumentResponseDTO> getByCustomer(String customerId) {
        return documentRepository.findByCustomerId(customerId).stream()
                .map(d -> toDto(d, "Unknown"))
                .collect(Collectors.toList());
    }
    
    public List<DocumentResponseDTO> getAll() {
        return documentRepository.findAll().stream()
                .map(d -> toDto(d, "Unknown"))
                .collect(Collectors.toList());
    }

    private DocumentResponseDTO toDto(DocumentEntity document, String uploaderName) {
        DocumentVersion currentVersion = document.getVersions().stream()
                .filter(v -> v.getVersionNumber().equals(document.getCurrentVersion()))
                .findFirst()
                .orElse(null);

        return DocumentResponseDTO.builder()
                .uuid(document.getUuid())
                .fileName(document.getFileName())
                .contentType(document.getContentType())
                .fileSizeBytes(currentVersion != null ? currentVersion.getFileSizeBytes() : 0)
                .uploadedByUserId(document.getUploadedByUserId())
                .uploaderName(uploaderName)
                .policyId(document.getPolicyId())
                .customerId(document.getCustomerId())
                .createdAt(document.getCreatedAt())
                .currentVersion(document.getCurrentVersion())
                .build();
    }
}
