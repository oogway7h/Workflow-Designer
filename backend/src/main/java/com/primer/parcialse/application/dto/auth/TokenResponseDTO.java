package com.primer.parcialse.application.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponseDTO {

    private String token;
    // private String email;
    // private String uuid;
    // private String name;

    /** Referencia al Role del usuario (por uuid) */
    // private String roleId;
}
