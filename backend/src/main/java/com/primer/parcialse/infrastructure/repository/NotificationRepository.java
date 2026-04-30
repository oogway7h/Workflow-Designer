package com.primer.parcialse.infrastructure.repository;

import com.primer.parcialse.domain.model.Notification;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repositorio para la entidad Notification.
 */
@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByUserUuid(String userUuid, Sort sort);

    long countByUserUuidAndIsRead(String userUuid, boolean isRead);

    List<Notification> findByUserUuid(String userUuid);
}
