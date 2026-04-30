package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.dto.department.DepartmentRequestDTO;
import com.primer.parcialse.application.dto.department.DepartmentResponseDTO;
import com.primer.parcialse.application.service.DepartmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @PostMapping
    public ResponseEntity<DepartmentResponseDTO> create(@Valid @RequestBody DepartmentRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(departmentService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<DepartmentResponseDTO>> getAll() {
        return ResponseEntity.ok(departmentService.getAll());
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<DepartmentResponseDTO> getByUuid(@PathVariable String uuid) {
        return ResponseEntity.ok(departmentService.getByUuid(uuid));
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<DepartmentResponseDTO> update(@PathVariable String uuid,
                                                         @Valid @RequestBody DepartmentRequestDTO request) {
        return ResponseEntity.ok(departmentService.update(uuid, request));
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Void> delete(@PathVariable String uuid) {
        departmentService.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
