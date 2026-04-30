package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.Policy;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio para la entidad Policy (Workflow).
 */
@Repository
public interface PolicyRepository extends MongoRepository<Policy, String> {

    Optional<Policy> findByUuid(String uuid);

    List<Policy> findByOwnerId(String ownerId);

    List<Policy> findByManagerId(String managerId);

    List<Policy> findByState(String state);

    List<Policy> findByCollaboratorIdsContaining(String collaboratorId);

    List<Policy> findByAccessType(String accessType);
}
