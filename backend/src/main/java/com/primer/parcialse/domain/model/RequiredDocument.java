package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Value Object - Documento requerido para una actividad.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequiredDocument {
    private String name;
    private String description;
    private Boolean required;
}
