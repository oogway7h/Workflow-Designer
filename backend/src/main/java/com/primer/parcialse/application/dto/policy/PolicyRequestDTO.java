package com.primer.parcialse.application.dto.policy;

import com.primer.parcialse.domain.model.ActivityNode;
import com.primer.parcialse.domain.model.Lane;
import com.primer.parcialse.domain.model.Transition;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PolicyRequestDTO {
    @NotBlank(message = "El nombre de la política es obligatorio")
    private String name;
    @NotBlank(message = "La descripción de la política es obligatoria")
    private String description;

    /**
     * Referencia al User que es el gestor de esta política (por uuid)
     */
    private String managerId;

    /**
     * Referencia al User diseñador que creó esta política (por uuid)
     */
    @NotBlank(message = "El diseñador de la política es obligatorio")
    private String ownerId;

    /**
     * Lista opcional de tareas/nodos con su formSchemaJson.
     * Permite crear/actualizar una política completa en un solo request.
     */
    private List<ActivityNode> activityNodes;

    /**
     * Lista opcional de transiciones entre tareas.
     */
    private List<Transition> transitions;

    /**
     * Lista opcional de carriles (calles) del diagrama.
     */
    private List<Lane> lanes;
}
