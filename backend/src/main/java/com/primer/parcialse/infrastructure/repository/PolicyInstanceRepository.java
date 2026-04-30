package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.PolicyInstance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio para la entidad PolicyInstance (Ejecución del workflow).
 */
@Repository
public interface PolicyInstanceRepository extends MongoRepository<PolicyInstance, String> {

    Optional<PolicyInstance> findByUuid(String uuid);

    List<PolicyInstance> findByPolicyId(String policyId);

    List<PolicyInstance> findByPolicyIdAndStatus(String policyId, String status);

    List<PolicyInstance> findByStatus(String status);

    @Query("{ 'status': 'ACTIVE', $or: [ { 'currentAssigneeId': ?0 }, { 'currentAssigneeRole': ?1 } ] }")
    List<PolicyInstance> findPendingTasks(String assigneeId, String assigneeRole);

    List<PolicyInstance> findByManagerIdOrderByUpdatedAtDesc(String managerId);

    @Query("{ 'history.assigneeId': ?0 }")
    List<PolicyInstance> findInstancesWithHistoryByAssigneeId(String assigneeId);

    List<PolicyInstance> findByApplicantId(String applicantId);

    List<PolicyInstance> findByManagerIdIsNull();
}
