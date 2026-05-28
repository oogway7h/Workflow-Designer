package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.DocumentEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends MongoRepository<DocumentEntity, String> {
    Optional<DocumentEntity> findByUuid(String uuid);
    List<DocumentEntity> findByPolicyId(String policyId);
    List<DocumentEntity> findByCustomerId(String customerId);
    List<DocumentEntity> findByUploadedByUserId(String userId);
    void deleteByUuid(String uuid);
    Optional<DocumentEntity> findByFileNameAndPolicyId(String fileName, String policyId);
    Optional<DocumentEntity> findByFileNameAndCustomerId(String fileName, String customerId);
}
