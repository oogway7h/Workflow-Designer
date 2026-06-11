package com.primer.parcialse.application.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteIntentRequestDTO {
    private String prompt;
    private String text;

    public String getEffectiveText() {
        if (text != null && !text.trim().isEmpty()) {
            return text;
        }
        return prompt;
    }
}
