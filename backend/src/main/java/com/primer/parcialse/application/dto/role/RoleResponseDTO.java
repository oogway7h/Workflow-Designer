package com.primer.parcialse.application.dto.role;

import com.primer.parcialse.domain.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponseDTO {

    private String uuid;
    private String roleName;
    private List<String> permissions;

    public static RoleResponseDTO fromEntity(Role role) {
        return RoleResponseDTO.builder()
                .uuid(role.getUuid())
                .roleName(role.getRoleName())
                .permissions(role.getPermissions())
                .build();
    }
}
