package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.dto.user.*;
import com.primer.parcialse.application.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ─── CRUD admin ────────────────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<UserResponseDTO> create(@Valid @RequestBody UserRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getAll() {
        return ResponseEntity.ok(userService.getAll());
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<UserResponseDTO> getByUuid(@PathVariable String uuid) {
        return ResponseEntity.ok(userService.getByUuid(uuid));
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<UserResponseDTO> update(@PathVariable String uuid,
            @Valid @RequestBody UserUpdateDTO request) {
        return ResponseEntity.ok(userService.update(uuid, request));
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Void> delete(@PathVariable String uuid) {
        userService.delete(uuid);
        return ResponseEntity.noContent().build();
    }

    // ─── Perfil propio (requiere JWT) ──────────────────────────────────────────

    @GetMapping("/me/profile")
    public ResponseEntity<UserResponseDTO> getMyProfile() {
        return ResponseEntity.ok(userService.getMyProfile());
    }

    @PutMapping("/me/profile")
    public ResponseEntity<UserResponseDTO> updateMyProfile(@Valid @RequestBody UpdateProfileDTO request) {
        return ResponseEntity.ok(userService.updateMyProfile(request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changeMyPassword(@Valid @RequestBody ChangePasswordDTO request) {
        userService.changeMyPassword(request);
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente"));
    }

    @PatchMapping("/me/complete-tour")
    public ResponseEntity<Map<String, String>> completeTour() {
        userService.completeTour();
        return ResponseEntity.ok(Map.of("message", "Tour completado"));
    }

    @PatchMapping("/me/fcm-token")
    public ResponseEntity<Map<String, String>> registerFcmToken(@RequestBody Map<String, String> body) {
        userService.updateFcmToken(body.get("fcmToken"));
        return ResponseEntity.ok(Map.of("message", "FCM token registrado"));
    }
}
