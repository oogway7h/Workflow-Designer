package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Value Object (Documento embebido) - HistoryItem.
 * Registra cada paso ejecutado dentro de una PolicyInstance (ejecución del
 * workflow).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoryItem {

    private String activityNodeId;
    private String assigneeId;
    private String action;
    private Instant timestamp;

    /**
     * Datos del formulario enviados por el usuario en esta etapa.
     */
    private Map<String, Object> formDataAtStep;

    public static HistoryItem create(String activityNodeId, String assigneeId, String action,
            Map<String, Object> formDataAtStep) {
        return HistoryItem.builder()
                .activityNodeId(activityNodeId)
                .assigneeId(assigneeId)
                .action(action)
                .timestamp(Instant.now())
                .formDataAtStep(formDataAtStep)
                .build();
    }
}
