package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.user.*;
import com.primer.parcialse.application.dto.auth.ForgotPasswordDTO;
import com.primer.parcialse.application.dto.auth.ResetPasswordDTO;
import com.primer.parcialse.domain.exception.DuplicateResourceException;
import com.primer.parcialse.domain.exception.ResourceNotFoundException;
import com.primer.parcialse.domain.model.User;
import com.primer.parcialse.infrastructure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${app.reset-token-expiry-minutes:15}")
    private int resetTokenExpiryMinutes;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    // ─── CRUD ──────────────────────────────────────────────────────────────────

    public UserResponseDTO create(UserRequestDTO request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Ya existe un usuario con email: " + request.getEmail());
        }
        User user = User.create(
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getName(),
                request.getLastname(),
                request.getRoleId(),
                request.getDepartmentId());
        userRepository.save(user);
        return UserResponseDTO.fromEntity(user);
    }

    public List<UserResponseDTO> getAll() {
        return userRepository.findAll().stream()
                .map(UserResponseDTO::fromEntity)
                .toList();
    }

    public UserResponseDTO getByUuid(String uuid) {
        User user = userRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + uuid));
        return UserResponseDTO.fromEntity(user);
    }

    public UserResponseDTO update(String uuid, UserUpdateDTO request) {
        User user = userRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + uuid));

        if (request.getEmail() != null)
            user.setEmail(request.getEmail());
        if (request.getName() != null)
            user.setName(request.getName());
        if (request.getLastname() != null)
            user.setLastname(request.getLastname());
        if (request.getRoleId() != null)
            user.setRoleId(request.getRoleId());
        if (request.getDepartmentId() != null)
            user.setDepartmentId(request.getDepartmentId());

        userRepository.save(user);
        return UserResponseDTO.fromEntity(user);
    }

    public void delete(String uuid) {
        User user = userRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + uuid));
        userRepository.delete(user);
    }

    // ─── PERFIL PROPIO ─────────────────────────────────────────────────────────

    public UserResponseDTO updateMyProfile(UpdateProfileDTO request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        user.setName(request.getName());
        user.setLastname(request.getLastname());
        userRepository.save(user);
        return UserResponseDTO.fromEntity(user);
    }

    public void changeMyPassword(ChangePasswordDTO request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BadCredentialsException("La contraseña actual es incorrecta");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public UserResponseDTO getMyProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        return UserResponseDTO.fromEntity(user);
    }

    // ─── TOUR ──────────────────────────────────────────────────────────────────

    public void completeTour() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        user.setFirstLogin(false);
        userRepository.save(user);
    }

    public void updateFcmToken(String fcmToken) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        user.setFcmToken(fcmToken);
        userRepository.save(user);
    }

    // ─── FORGOT / RESET PASSWORD ────────────────────────────────────────────────

    public void forgotPassword(ForgotPasswordDTO request) {
        // Siempre responder OK para no revelar si el email existe
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            Date expiry = new Date(System.currentTimeMillis() + (long) resetTokenExpiryMinutes * 60 * 1000);
            user.setResetToken(token);
            user.setResetTokenExpiry(expiry);
            userRepository.save(user);

            // Imprimir en consola para desarrollo (sin SMTP real configurado)
            String resetLink = frontendUrl + "/auth/reset-password?token=" + token;

            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom("carlosotsu74@gmail.com");
                message.setTo(user.getEmail());
                message.setSubject("Recuperación de contraseña - Motor de Workflows");
                message.setText("Hola " + user.getName() + ",\n\n"
                        + "Haz clic en el siguiente enlace para restablecer tu contraseña:\n"
                        + resetLink + "\n\n"
                        + "Este enlace expira en " + resetTokenExpiryMinutes + " minutos.\n\n"
                        + "Si no solicitaste esto, ignora este mensaje.");
                mailSender.send(message);
                System.out.println("[ForgotPassword] Email enviado a: " + user.getEmail());
            } catch (Exception e) {
                System.err.println("[ForgotPassword] No se pudo enviar email: " + e.getMessage());
            }
        });
    }

    public void resetPassword(ResetPasswordDTO request) {
        User user = userRepository.findByResetToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Token inválido o expirado"));
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().before(new Date())) {
            throw new RuntimeException("El token de recuperación ha expirado");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }
}
