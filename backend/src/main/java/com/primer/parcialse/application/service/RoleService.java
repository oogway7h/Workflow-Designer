package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.role.RoleRequestDTO;
import com.primer.parcialse.application.dto.role.RoleResponseDTO;
import com.primer.parcialse.domain.exception.DuplicateResourceException;
import com.primer.parcialse.domain.exception.ResourceNotFoundException;
import com.primer.parcialse.domain.model.Role;
import com.primer.parcialse.infrastructure.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleResponseDTO create(RoleRequestDTO request) {
        roleRepository.findByRoleName(request.getRoleName()).ifPresent(r -> {
            throw new DuplicateResourceException("Ya existe un rol con nombre: " + request.getRoleName());
        });
        Role role = Role.create(request.getRoleName(), request.getPermissions());
        roleRepository.save(role);
        return RoleResponseDTO.fromEntity(role);
    }

    public List<RoleResponseDTO> getAll() {
        return roleRepository.findAll().stream()
                .map(RoleResponseDTO::fromEntity)
                .toList();
    }

    public RoleResponseDTO getByUuid(String uuid) {
        Role role = roleRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado: " + uuid));
        return RoleResponseDTO.fromEntity(role);
    }

    public RoleResponseDTO update(String uuid, RoleRequestDTO request) {
        Role role = roleRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado: " + uuid));
        role.setRoleName(request.getRoleName());
        role.setPermissions(request.getPermissions());
        roleRepository.save(role);
        return RoleResponseDTO.fromEntity(role);
    }

    public void delete(String uuid) {
        Role role = roleRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado: " + uuid));
        roleRepository.delete(role);
    }
}
