package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.Role;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio para la entidad Role.
 */
@Repository
public interface RoleRepository extends MongoRepository<Role, String> {

    Optional<Role> findByUuid(String uuid);

    Optional<Role> findByRoleName(String roleName);
}
