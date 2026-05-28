package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "documents")
public class DocumentEntity {
    @Id
    private String id;
    private String uuid;
    private String fileName;
    private String contentType;
    
    // Repositorios
    private String policyId;
    private String customerId;
    
    // Versionado
    private Integer currentVersion;
    @Builder.Default
    private List<DocumentVersion> versions = new ArrayList<>();
    
    private String uploadedByUserId;
    private Instant createdAt;
    private Instant updatedAt;
}
