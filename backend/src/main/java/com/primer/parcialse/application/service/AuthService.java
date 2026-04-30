package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.auth.LoginRequestDTO;
import com.primer.parcialse.application.dto.auth.TokenResponseDTO;
import com.primer.parcialse.domain.model.User;
import com.primer.parcialse.infrastructure.repository.UserRepository;
import com.primer.parcialse.infrastructure.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final com.primer.parcialse.infrastructure.repository.RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public TokenResponseDTO login(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Credenciales inválidas");
        }

        com.primer.parcialse.domain.model.Role role = roleRepository.findByUuid(user.getRoleId())
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));

        String internalRole = mapRoleNameToInternal(role.getRoleName());

        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "uuid", user.getUuid(),
                "name", user.getName(),
                "roleId", user.getRoleId(),
                "role", internalRole));

        return TokenResponseDTO.builder()
                .token(token)
                .build();
    }

    private String mapRoleNameToInternal(String roleName) {
        if (roleName == null) return "EMPLOYEE";
        return switch (roleName) {
            case "Funcionario" -> "EMPLOYEE";
            case "Diseñador de Politicas", "Diseñador de Políticas" -> "DESIGNER";
            case "Gestor de Politicas", "Gestor de Políticas" -> "MANAGER";
            case "Administrador", "ADMIN" -> "ADMIN";
            case "CUSTOMER" -> "CUSTOMER";
            default -> roleName.toUpperCase().replace(" ", "_");
        };
    }

    public com.primer.parcialse.application.dto.user.UserResponseDTO registerCustomer(com.primer.parcialse.application.dto.auth.CustomerRegisterDTO request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new com.primer.parcialse.domain.exception.DuplicateResourceException("Ya existe un usuario con email: " + request.getEmail());
        }

        com.primer.parcialse.domain.model.Role customerRole = roleRepository.findByRoleName("CUSTOMER")
                .orElseGet(() -> {
                    com.primer.parcialse.domain.model.Role newRole = com.primer.parcialse.domain.model.Role.create("CUSTOMER", java.util.List.of());
                    return roleRepository.save(newRole);
                });

        User user = User.create(
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getName(),
                request.getLastname(),
                customerRole.getUuid(),
                null
        );

        userRepository.save(user);
        return com.primer.parcialse.application.dto.user.UserResponseDTO.fromEntity(user);
    }
}
