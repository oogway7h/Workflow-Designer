package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVersion {
    private Integer versionNumber;
    private String s3Key;
    private long fileSizeBytes;
    private Instant uploadedAt;
    private String uploadedByUserId;
}
