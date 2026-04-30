package com.primer.parcialse.application.dto.ai;

import lombok.Data;
import java.util.Map;

@Data
public class NlpFillFormResponseDTO {
    private Map<String, Object> filledForm;
}
