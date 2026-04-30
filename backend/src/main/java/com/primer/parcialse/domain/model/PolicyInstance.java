package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Entidad principal PolicyInstance (La ejecución de un Workflow).
 * Registra una instancia específica de ejecución de una Policy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "policy_instances")
public class PolicyInstance {

    @Id
    private String id;

    private String uuid;

    /** Referencia a la Policy (workflow) que se está ejecutando (por uuid) */
    private String policyId;

    /** ID del solicitante cliente (EXTERNAL) */
    private String applicantId;

    /** ID de quien inició el trámite o Gestor asignado */
    private String managerId;

    /** Estado de la ejecución: ACTIVE, COMPLETED, CANCELLED */
    private String status;

    /** UUID del ActivityNode actual */
    private String currentActivityNodeId;

    /** ID del funcionario si la tarea es directa */
    private String currentAssigneeId;

    /** Rol o carril (lane) si la tarea es para un grupo */
    private String currentAssigneeRole;

    /** Datos de los formularios y estado de la ejecución de la política */
    @Builder.Default
    private Map<String, Object> instanceData = new HashMap<>();

    /** Lista del historial de actividades ejecutadas */
    @Builder.Default
    private List<HistoryItem> history = new ArrayList<>();

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    public static PolicyInstance create(String policyId, String managerId, String initialActivityNodeId) {
        return PolicyInstance.builder()
                .uuid(UUID.randomUUID().toString())
                .policyId(policyId)
                .managerId(managerId)
                .status("ACTIVE")
                .currentActivityNodeId(initialActivityNodeId)
                .instanceData(new HashMap<>())
                .history(new ArrayList<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}
