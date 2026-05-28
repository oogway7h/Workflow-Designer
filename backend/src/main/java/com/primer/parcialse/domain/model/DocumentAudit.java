package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "document_audit")
public class DocumentAudit {
    @Id
    private String id;
    private String uuid;
    private String documentId;
    private String documentName;
    private String userId;
    private String userName;
    private String action; // UPLOAD, DOWNLOAD, VIEW, DELETE, UPDATE
    private String details;
    private Instant timestamp;
}
