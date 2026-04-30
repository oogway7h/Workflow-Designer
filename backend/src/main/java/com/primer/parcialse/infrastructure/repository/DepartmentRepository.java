package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.Department;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio para la entidad Department.
 */
@Repository
public interface DepartmentRepository extends MongoRepository<Department, String> {

    Optional<Department> findByUuid(String uuid);

    Optional<Department> findByName(String name);
}
