package com.primer.parcialse.application.dto.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleRequestDTO {

    @NotBlank(message = "El nombre del rol es obligatorio")
    private String roleName;

    @NotNull(message = "La lista de permisos es obligatoria")
    private List<String> permissions;
}
