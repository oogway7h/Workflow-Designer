package com.primer.parcialse.application.dto.user;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateDTO {

    @Email(message = "Formato de email inválido")
    private String email;

    private String name;
    private String lastname;
    private String roleId;
    private String departmentId;
}
