package com.primer.parcialse.application.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantRequestDTO {
    @JsonProperty("user_role")
    private String userRole;

    @JsonProperty("current_screen")
    private String currentScreen;

    @JsonProperty("user_message")
    private String userMessage;

    @JsonProperty("screen_data")
    private String screenData;
}
