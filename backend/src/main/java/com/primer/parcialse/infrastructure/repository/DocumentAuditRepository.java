package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.DocumentAudit;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentAuditRepository extends MongoRepository<DocumentAudit, String> {
    List<DocumentAudit> findByDocumentIdOrderByTimestampDesc(String documentId);
    List<DocumentAudit> findByUserIdOrderByTimestampDesc(String userId);
    List<DocumentAudit> findTop50ByOrderByTimestampDesc();
}
