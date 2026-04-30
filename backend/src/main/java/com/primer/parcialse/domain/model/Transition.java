package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Value Object (Documento embebido) - Transition.
 * Representa una transición entre dos ActivityNodes dentro de un Workflow
 * (Policy).
 * Define la condición bajo la cual se pasa de una actividad a la siguiente.
 * NO es una colección separada en MongoDB.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transition {

    private String sourceActivityId;
    private String targetActivityId;

    /**
     * Condición de la transición (expresión evaluable o descripción).
     * Ejemplo: "approved == true" o "totalAmount > 5000"
     */
    private String condition;

    /**
     * Si es true, la transición es un flujo de objeto (línea punteada en UML 2.5).
     * Se usa para conectar nodos OBJECT o SIGNAL.
     */
    private Boolean dashed;

    public static Transition create(String sourceActivityId, String targetActivityId, String condition) {
        return Transition.builder()
                .sourceActivityId(sourceActivityId)
                .targetActivityId(targetActivityId)
                .condition(condition)
                .build();
    }
}
