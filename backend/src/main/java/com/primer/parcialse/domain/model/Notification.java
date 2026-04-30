package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

/**
 * Entidad principal Notification.
 * Representa una notificación enviada a un usuario del sistema.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    private String uuid;

    /** UUID del usuario destinatario */
    private String userUuid;

    private String title;
    private String message;

    /** TASK_ASSIGNED | STATUS_CHANGED | INFO */
    private String type;

    @Builder.Default
    private boolean isRead = false;

    /** UUID de la PolicyInstance relacionada */
    private String relatedId;

    @CreatedDate
    private Instant createdAt;

    public static Notification create(String userUuid, String title, String message,
            String type, String relatedId) {
        return Notification.builder()
                .uuid(UUID.randomUUID().toString())
                .userUuid(userUuid)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .relatedId(relatedId)
                .createdAt(Instant.now())
                .build();
    }
}
