package com.primer.parcialse.application.dto.policy;

import com.primer.parcialse.domain.model.ActivityNode;
import com.primer.parcialse.domain.model.Lane;
import com.primer.parcialse.domain.model.Policy;
import com.primer.parcialse.domain.model.Transition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicyResponseDTO {

    private String uuid;
    private String name;
    private String description;
    private String managerId;
    private String ownerId;
    private String visibility;
    private List<String> collaboratorIds;
    private String state;
    private List<ActivityNode> activityNodes;
    private List<Transition> transitions;
    private List<Lane> lanes;

    public static PolicyResponseDTO fromEntity(Policy policy) {
        return PolicyResponseDTO.builder()
                .uuid(policy.getUuid())
                .name(policy.getName())
                .description(policy.getDescription())
                .managerId(policy.getManagerId())
                .ownerId(policy.getOwnerId())
                .visibility(policy.getVisibility())
                .collaboratorIds(policy.getCollaboratorIds())
                .state(policy.getState())
                .activityNodes(policy.getActivityNodes())
                .transitions(policy.getTransitions())
                .lanes(policy.getLanes())
                .build();
    }
}
