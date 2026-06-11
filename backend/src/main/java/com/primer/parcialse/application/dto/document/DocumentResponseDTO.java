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
public class DocumentResponseDTO {
    private String uuid;
    private String fileName;
    private String contentType;
    private long fileSizeBytes;
    private String uploadedByUserId;
    private String uploaderName;
    private String policyId;
    private String customerId;
    private String requirementName;
    private Instant createdAt;
    private String downloadUrl;
    private Integer currentVersion;
}
