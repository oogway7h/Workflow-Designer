package com.primer.parcialse.application.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BottleneckResponseDTO {
    private List<String> bottlenecks;
    private List<String> recommendations;
}
