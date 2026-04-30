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
public class RoutingResponseDTO {
    @JsonProperty("recommended_candidate_id")
    private String recommendedCandidateId;
    private String reasoning;
}
