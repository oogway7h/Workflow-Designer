package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entidad principal Policy (El Workflow).
 * Contiene la definición completa del flujo de trabajo:
 * - Lista de ActivityNodes (documentos embebidos)
 * - Lista de Transitions (documentos embebidos)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "policies")
public class Policy {

    @Id
    private String id;

    private String uuid;
    private String name;
    private String description;

    /** Referencia al User que es el gestor de esta política (por uuid) */
    private String managerId;

    /** Referencia al User diseñador que creó esta política (por uuid) */
    private String ownerId;

    /** Visibilidad de la politica */
    @Builder.Default
    private String visibility = "PRIVATE";

    /** Tipo de acceso: INTERNAL o EXTERNAL */
    @Builder.Default
    private String accessType = "INTERNAL";

    /** Colaboradores */
    @Builder.Default
    private List<String> collaboratorIds = new ArrayList<>();

    /** Estado del workflow: DRAFT, ACTIVE, INACTIVE */
    private String state;

    /** Lista embebida de nodos de actividad */
    @Builder.Default
    private List<ActivityNode> activityNodes = new ArrayList<>();

    /** Lista embebida de transiciones entre nodos */
    @Builder.Default
    private List<Transition> transitions = new ArrayList<>();

    /** Lista embebida de carriles (calles) del diagrama */
    @Builder.Default
    private List<Lane> lanes = new ArrayList<>();

    public static Policy create(String name, String description, String managerId, String ownerId) {
        return Policy.builder()
                .uuid(UUID.randomUUID().toString())
                .name(name)
                .description(description)
                .managerId(managerId)
                .ownerId(ownerId)
                .state("DRAFT")
                .activityNodes(new ArrayList<>())
                .transitions(new ArrayList<>())
                .lanes(new ArrayList<>())
                .build();
    }
}
