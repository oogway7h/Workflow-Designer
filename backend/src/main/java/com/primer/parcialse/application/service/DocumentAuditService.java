package com.primer.parcialse.application.service;

import com.primer.parcialse.domain.model.DocumentAudit;
import com.primer.parcialse.infrastructure.repository.DocumentAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentAuditService {

    private final DocumentAuditRepository documentAuditRepository;

    public DocumentAudit logAction(String docId, String docName, 
                                   String userId, String userName, 
                                   String action, String details) {
        DocumentAudit audit = DocumentAudit.builder()
            .uuid(UUID.randomUUID().toString())
            .documentId(docId)
            .documentName(docName)
            .userId(userId)
            .userName(userName)
            .action(action)
            .details(details)
            .timestamp(Instant.now())
            .build();
        return documentAuditRepository.save(audit);
    }

    public java.util.List<DocumentAudit> getByDocumentId(String docId) {
        return documentAuditRepository.findByDocumentIdOrderByTimestampDesc(docId);
    }

    public java.util.List<DocumentAudit> getRecentAudits() {
        return documentAuditRepository.findTop50ByOrderByTimestampDesc();
    }
}
