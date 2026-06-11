package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.notification.NotificationDTO;
import com.primer.parcialse.domain.model.Notification;
import com.primer.parcialse.infrastructure.repository.NotificationRepository;
import com.primer.parcialse.infrastructure.repository.UserRepository;
import com.primer.parcialse.domain.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    /**
     * Crea y persiste una notificación para un usuario dado su UUID, y envía push
     * FCM.
     */
    public void createNotification(String userUuid, String title, String message,
            String type, String relatedId) {
        try {
            Notification notification = Notification.create(userUuid, title, message, type, relatedId);
            notificationRepository.save(notification);
            log.debug("Notificación creada para usuario {}: {}", userUuid, title);

            // Send FCM push if user has a registered token
            userRepository.findByUuid(userUuid).ifPresent(user -> {
                if (user.getFcmToken() != null && !user.getFcmToken().isBlank()) {
                    fcmService.sendToToken(user.getFcmToken(), title, message);
                }
            });
        } catch (Exception e) {
            log.error("Error al crear notificación para {}: {}", userUuid, e.getMessage());
        }
    }

    /**
     * Retorna las notificaciones del usuario autenticado, ordenadas por fecha desc.
     */
    public List<NotificationDTO> getMyNotifications() {
        String userUuid = getCurrentUserUuid();
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        return notificationRepository.findByUserUuid(userUuid, sort)
                .stream()
                .map(NotificationDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retorna el conteo de notificaciones no leídas del usuario autenticado.
     */
    public long getUnreadCount() {
        String userUuid = getCurrentUserUuid();
        return notificationRepository.countByUserUuidAndIsRead(userUuid, false);
    }

    /**
     * Marca una notificación como leída (solo si pertenece al usuario autenticado).
     */
    public void markAsRead(String notificationUuid) {
        String userUuid = getCurrentUserUuid();
        notificationRepository.findByUserUuid(userUuid).stream()
                .filter(n -> notificationUuid.equals(n.getUuid()))
                .findFirst()
                .ifPresent(n -> {
                    n.setRead(true);
                    notificationRepository.save(n);
                });
    }

    /**
     * Elimina todas las notificaciones del usuario autenticado.
     */
    public void deleteMyNotifications() {
        String userUuid = getCurrentUserUuid();
        List<Notification> all = notificationRepository.findByUserUuid(userUuid);
        notificationRepository.deleteAll(all);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String getCurrentUserUuid() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .map(User::getUuid)
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Usuario autenticado no encontrado"));
    }
}
