package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Entidad principal User.
 * Representa un usuario del sistema con sus datos de autenticación y
 * pertenencia organizacional.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String uuid;
    private String email;
    private String password;
    private String name;
    private String lastname;

    /** Referencia al Role (por uuid) */
    private String roleId;

    /** Referencia al Department (por uuid) */
    private String departmentId;

    /** True si es el primer inicio de sesión (muestra el tour interactivo) */
    @Builder.Default
    private boolean isFirstLogin = false;

    /** Token para recuperación de contraseña (nullable) */
    private String resetToken;

    /** Fecha de expiración del token de recuperación (nullable) */
    private Date resetTokenExpiry;

    /** FCM device token for push notifications (nullable) */
    private String fcmToken;

    public static User create(String email, String encodedPassword, String name, String lastname,
            String roleId, String departmentId) {
        return User.builder()
                .uuid(UUID.randomUUID().toString())
                .email(email)
                .password(encodedPassword)
                .name(name)
                .lastname(lastname)
                .roleId(roleId)
                .departmentId(departmentId)
                .isFirstLogin(false)
                .build();
    }
}
