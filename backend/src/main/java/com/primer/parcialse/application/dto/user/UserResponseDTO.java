package com.primer.parcialse.application.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.primer.parcialse.domain.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {

    private String uuid;
    private String email;
    private String name;
    private String lastname;
    private String roleId;
    private String departmentId;
    @JsonProperty("isFirstLogin")
    private boolean isFirstLogin;

    public static UserResponseDTO fromEntity(User user) {
        return UserResponseDTO.builder()
                .uuid(user.getUuid())
                .email(user.getEmail())
                .name(user.getName())
                .lastname(user.getLastname())
                .roleId(user.getRoleId())
                .departmentId(user.getDepartmentId())
                .isFirstLogin(user.isFirstLogin())
                .build();
    }
}
