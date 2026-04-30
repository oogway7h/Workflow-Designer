package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio para la entidad User.
 * Extiende MongoRepository para operaciones CRUD básicas.
 */
@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUuid(String uuid);

    java.util.List<User> findByRoleId(String roleId);

    boolean existsByEmail(String email);

    Optional<User> findByResetToken(String resetToken);
}
