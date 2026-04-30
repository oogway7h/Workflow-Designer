package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

/**
 * Value Object (Documento embebido) - ActivityNode.
 * Representa un nodo de actividad dentro de un Workflow (Policy).
 * Contiene un formulario dinámico como JSON/Map.
 * NO es una colección separada en MongoDB.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityNode {

    private String uuid;
    private String name;
    private String description;
    private String state;

    /** Coordenada X en el diagrama */
    private Double x;

    /** Coordenada Y en el diagrama */
    private Double y;

    /** ID del carril al que pertenece (opcional) */
    private String laneId;

    /** ID del usuario asignado a esta actividad (opcional) */
    private String assigneeId;

    /**
     * Schema del formulario dinámico asociado a esta actividad.
     * Almacenado como Map para máxima flexibilidad NoSQL.
     * Ejemplo: { "fields": [{ "name": "aprobacion", "type": "boolean" }] }
     */
    private Map<String, Object> formSchemaJson;

    public static ActivityNode create(String name, String description, String state, Map<String, Object> formSchema) {
        return ActivityNode.builder()
                .uuid(UUID.randomUUID().toString())
                .name(name)
                .description(description)
                .state(state)
                .formSchemaJson(formSchema)
                .build();
    }
}
