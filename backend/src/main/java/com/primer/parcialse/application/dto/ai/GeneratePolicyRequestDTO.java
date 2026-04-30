package com.primer.parcialse.application.dto.ai;

import com.primer.parcialse.application.dto.department.DepartmentResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratePolicyRequestDTO {
    private String prompt;
    private List<DepartmentResponseDTO> departments;
}