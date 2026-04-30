package com.primer.parcialse.application.dto.department;

import com.primer.parcialse.domain.model.Department;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponseDTO {

    private String uuid;
    private String name;

    public static DepartmentResponseDTO fromEntity(Department department) {
        return DepartmentResponseDTO.builder()
                .uuid(department.getUuid())
                .name(department.getName())
                .build();
    }
}
