package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Value Object (Documento embebido) - Lane.
 * Representa un carril (calle) en el editor gráfico del workflow.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Lane {
    private String id;
    private String name;
    private Double x;
    private Double width;
}