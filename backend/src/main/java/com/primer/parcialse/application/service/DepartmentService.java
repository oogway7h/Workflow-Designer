package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.department.DepartmentRequestDTO;
import com.primer.parcialse.application.dto.department.DepartmentResponseDTO;
import com.primer.parcialse.domain.exception.DuplicateResourceException;
import com.primer.parcialse.domain.exception.ResourceNotFoundException;
import com.primer.parcialse.domain.model.Department;
import com.primer.parcialse.infrastructure.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentResponseDTO create(DepartmentRequestDTO request) {
        departmentRepository.findByName(request.getName()).ifPresent(d -> {
            throw new DuplicateResourceException("Ya existe un departamento con nombre: " + request.getName());
        });
        Department department = Department.create(request.getName());
        departmentRepository.save(department);
        return DepartmentResponseDTO.fromEntity(department);
    }

    public List<DepartmentResponseDTO> getAll() {
        return departmentRepository.findAll().stream()
                .map(DepartmentResponseDTO::fromEntity)
                .toList();
    }

    public DepartmentResponseDTO getByUuid(String uuid) {
        Department department = departmentRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + uuid));
        return DepartmentResponseDTO.fromEntity(department);
    }

    public DepartmentResponseDTO update(String uuid, DepartmentRequestDTO request) {
        Department department = departmentRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + uuid));
        department.setName(request.getName());
        departmentRepository.save(department);
        return DepartmentResponseDTO.fromEntity(department);
    }

    public void delete(String uuid) {
        Department department = departmentRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Departamento no encontrado: " + uuid));
        departmentRepository.delete(department);
    }
}
