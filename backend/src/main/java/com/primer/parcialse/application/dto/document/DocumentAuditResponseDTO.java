package com.primer.parcialse.application.dto.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAuditResponseDTO {
    private String uuid;
    private String documentId;
    private String documentName;
    private String userId;
    private String userName;
    private String action;
    private String details;
    private Instant timestamp;
}
