package com.primer.parcialse.application.dto.ai;

import lombok.Data;
import java.util.Map;

@Data
public class NlpFillFormRequestDTO {
    private String spokenText;
    private Map<String, Object> formSchema;
}
