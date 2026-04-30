package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.UUID;

/**
 * Entidad principal Role.
 * Define los roles del sistema y sus permisos asociados.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "roles")
public class Role {

    @Id
    private String id;

    private String uuid;
    private String roleName;

    /** Lista de permisos (ej: "READ_POLICY", "MANAGE_USERS", etc.) */
    private List<String> permissions;

    public static Role create(String roleName, List<String> permissions) {
        return Role.builder()
                .uuid(UUID.randomUUID().toString())
                .roleName(roleName)
                .permissions(permissions)
                .build();
    }
}
