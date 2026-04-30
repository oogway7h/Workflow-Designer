package com.primer.parcialse.application.dto.notification;

import com.primer.parcialse.domain.model.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private String uuid;
    private String title;
    private String message;
    private String type;
    private boolean isRead;
    private String relatedId;
    private Instant createdAt;

    public static NotificationDTO fromEntity(Notification n) {
        return NotificationDTO.builder()
                .uuid(n.getUuid())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .isRead(n.isRead())
                .relatedId(n.getRelatedId())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
