package com.primer.parcialse.application.dto.policy;

import com.primer.parcialse.domain.model.ActivityNode;
import com.primer.parcialse.domain.model.Lane;
import com.primer.parcialse.domain.model.Transition;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PolicyDiagramDTO {

    @NotNull(message = "La lista de nodos de actividad es obligatoria")
    private List<ActivityNode> activityNodes;

    @NotNull(message = "La lista de transiciones es obligatoria")
    private List<Transition> transitions;

    private List<Lane> lanes;
}
