package com.primer.parcialse.application.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import com.primer.parcialse.application.dto.department.DepartmentResponseDTO;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyDiagramRequestDTO {
    private String prompt;
    private List<DepartmentResponseDTO> departments;
    @com.fasterxml.jackson.annotation.JsonProperty("current_diagram_json")
    private Object currentDiagramJson;
}
