package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.dto.auth.*;
import com.primer.parcialse.application.dto.user.UserResponseDTO;
import com.primer.parcialse.application.service.AuthService;
import com.primer.parcialse.application.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<TokenResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register-customer")
    public ResponseEntity<UserResponseDTO> registerCustomer(@Valid @RequestBody CustomerRegisterDTO request) {
        return ResponseEntity.status(201).body(authService.registerCustomer(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordDTO request) {
        userService.forgotPassword(request);
        return ResponseEntity.ok(Map.of("message", "Si el correo existe, recibirás un enlace de recuperación"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordDTO request) {
        userService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Contraseña restablecida correctamente"));
    }
}
