package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.dto.role.RoleRequestDTO;
import com.primer.parcialse.application.dto.role.RoleResponseDTO;
import com.primer.parcialse.application.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @PostMapping
    public ResponseEntity<RoleResponseDTO> create(@Valid @RequestBody RoleRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<RoleResponseDTO>> getAll() {
        return ResponseEntity.ok(roleService.getAll());
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<RoleResponseDTO> getByUuid(@PathVariable String uuid) {
        return ResponseEntity.ok(roleService.getByUuid(uuid));
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<RoleResponseDTO> update(@PathVariable String uuid,
                                                   @Valid @RequestBody RoleRequestDTO request) {
        return ResponseEntity.ok(roleService.update(uuid, request));
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Void> delete(@PathVariable String uuid) {
        roleService.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
