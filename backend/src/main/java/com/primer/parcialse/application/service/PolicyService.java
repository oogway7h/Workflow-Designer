package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.policy.PolicyDiagramDTO;
import com.primer.parcialse.application.dto.policy.PolicyRequestDTO;
import com.primer.parcialse.application.dto.policy.PolicyResponseDTO;
import com.primer.parcialse.application.dto.ai.AutoAssignPolicyRequestDTO;
import com.primer.parcialse.application.dto.ai.AutoAssignPolicyRequestDTO.ActivityInfoDTO;
import com.primer.parcialse.application.dto.ai.AutoAssignPolicyRequestDTO.EmployeeInfoDTO;
import com.primer.parcialse.application.dto.ai.AutoAssignPolicyResponseDTO;
import com.primer.parcialse.domain.exception.ResourceNotFoundException;
import com.primer.parcialse.domain.model.ActivityNode;
import com.primer.parcialse.domain.model.Lane;
import com.primer.parcialse.domain.model.Policy;
import com.primer.parcialse.domain.model.Role;
import com.primer.parcialse.domain.model.Transition;
import com.primer.parcialse.domain.model.User;
import com.primer.parcialse.infrastructure.repository.PolicyInstanceRepository;
import com.primer.parcialse.infrastructure.repository.PolicyRepository;
import com.primer.parcialse.infrastructure.repository.RoleRepository;
import com.primer.parcialse.infrastructure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PolicyService {

    private final PolicyRepository policyRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PolicyInstanceRepository policyInstanceRepository;
    private final AiIntegrationService aiIntegrationService;

    private void assignLanesToNodes(List<ActivityNode> nodes, List<Lane> lanes) {
        if (nodes != null && lanes != null && !lanes.isEmpty()) {
            for (ActivityNode node : nodes) {
                if (node.getX() != null) {
                    for (Lane lane : lanes) {
                        double laneX = lane.getX() != null ? lane.getX() : 0.0;
                        double laneWidth = lane.getWidth() != null ? lane.getWidth() : 0.0;
                        if (node.getX() >= laneX && node.getX() <= (laneX + laneWidth)) {
                            node.setLaneId(lane.getId());
                            break;
                        }
                    }
                }
            }
        }
    }

    public PolicyResponseDTO create(PolicyRequestDTO request) {
        Policy policy = Policy.create(request.getName(), request.getDescription(), request.getManagerId(),
                request.getOwnerId());
        if (request.getActivityNodes() != null) {
            policy.setActivityNodes(request.getActivityNodes());
        }
        if (request.getTransitions() != null) {
            policy.setTransitions(request.getTransitions());
        }
        if (request.getLanes() != null) {
            policy.setLanes(request.getLanes());
        }

        assignLanesToNodes(policy.getActivityNodes(), policy.getLanes());

        policyRepository.save(policy);
        return PolicyResponseDTO.fromEntity(policy);
    }

    public List<PolicyResponseDTO> getAll() {
        return policyRepository.findAll().stream()
                .map(PolicyResponseDTO::fromEntity)
                .toList();
    }

    public List<PolicyResponseDTO> getExternalPolicies() {
        return policyRepository.findByAccessType("EXTERNAL").stream()
                .map(PolicyResponseDTO::fromEntity)
                .toList();
    }

    public List<PolicyResponseDTO> getAllByOwnerId(String ownerId) {
        return policyRepository.findByOwnerId(ownerId).stream()
                .map(PolicyResponseDTO::fromEntity)
                .toList();
    }

    public List<PolicyResponseDTO> getAllByManagerId(String managerId) {
        return policyRepository.findByManagerId(managerId).stream()
                .map(PolicyResponseDTO::fromEntity)
                .toList();
    }

    public PolicyResponseDTO getByUuid(String uuid) {
        Policy policy = policyRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + uuid));
        return PolicyResponseDTO.fromEntity(policy);
    }

    public PolicyResponseDTO update(String uuid, PolicyRequestDTO request) {
        Policy policy = policyRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + uuid));
        policy.setName(request.getName());
        policy.setDescription(request.getDescription());
        policy.setManagerId(request.getManagerId());
        policy.setOwnerId(request.getOwnerId());
        if (request.getActivityNodes() != null) {
            policy.setActivityNodes(request.getActivityNodes());
        }
        if (request.getTransitions() != null) {
            policy.setTransitions(request.getTransitions());
        }
        if (request.getLanes() != null) {
            policy.setLanes(request.getLanes());
        }

        assignLanesToNodes(policy.getActivityNodes(), policy.getLanes());

        policyRepository.save(policy);
        return PolicyResponseDTO.fromEntity(policy);
    }

    public PolicyResponseDTO updateState(String uuid, String state) {
        Policy policy = policyRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + uuid));

        if (state != null) {
            state = state.toUpperCase().trim();
            if (state.equals("INACTIVA") || state.equals("INACTIVADO")) {
                state = "INACTIVE";
            } else if (state.equals("ACTIVA") || state.equals("ACTIVADO")) {
                state = "ACTIVE";
            } else if (state.equals("BORRADOR")) {
                state = "DRAFT";
            }
        }

        policy.setState(state);
        policyRepository.save(policy);
        return PolicyResponseDTO.fromEntity(policy);
    }

    public PolicyResponseDTO updateDiagram(String uuid, PolicyDiagramDTO diagramDTO) {
        Policy policy = policyRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + uuid));

        List<ActivityNode> nodes = diagramDTO.getActivityNodes();
        List<Transition> transitions = diagramDTO.getTransitions();
        List<Lane> lanes = diagramDTO.getLanes() != null ? diagramDTO.getLanes() : policy.getLanes();

        assignLanesToNodes(nodes, lanes);

        policy.setActivityNodes(nodes);
        policy.setTransitions(transitions);
        if (diagramDTO.getLanes() != null) {
            policy.setLanes(diagramDTO.getLanes());
        }
        policyRepository.save(policy);
        return PolicyResponseDTO.fromEntity(policy);
    }

    public PolicyResponseDTO assignActivityUser(String policyUuid, String activityId, String userId) {
        Policy policy = policyRepository.findByUuid(policyUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + policyUuid));

        if (policy.getActivityNodes() != null) {
            policy.getActivityNodes().stream()
                    .filter(node -> activityId.equals(node.getUuid()))
                    .findFirst()
                    .ifPresent(node -> node.setAssigneeId(userId));
        }

        policyRepository.save(policy);
        return PolicyResponseDTO.fromEntity(policy);
    }

    public AutoAssignPolicyResponseDTO getAutoAssignRecommendations(String policyUuid) {
        Policy policy = policyRepository.findByUuid(policyUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + policyUuid));

        // Get EMPLOYEE role id
        Role employeeRole = roleRepository.findByRoleName("Funcionario")
                .orElseThrow(() -> new ResourceNotFoundException("Rol 'Funcionario' no encontrado"));

        List<User> employees = userRepository.findByRoleId(employeeRole.getUuid());

        // Build employee metrics
        List<EmployeeInfoDTO> employeeDTOs = new ArrayList<>();
        for (User emp : employees) {
            int pendingTasks = policyInstanceRepository.findPendingTasks(emp.getUuid(), "EMPLOYEE").size();
            employeeDTOs.add(EmployeeInfoDTO.builder()
                    .uuid(emp.getUuid())
                    .name(emp.getName() + " " + emp.getLastname())
                    .roleName("Funcionario")
                    .currentPendingTasks(pendingTasks)
                    .avgCompletionHours(0.0)
                    .departmentId(emp.getDepartmentId())
                    .build());
        }

        // Build activity infos
        List<ActivityInfoDTO> activityDTOs = new ArrayList<>();
        List<Lane> lanes = policy.getLanes() != null ? policy.getLanes() : new ArrayList<>();
        if (policy.getActivityNodes() != null) {
            for (ActivityNode node : policy.getActivityNodes()) {
                if (!"ACTIVITY".equals(node.getState()) && !"APPROVAL".equals(node.getState())) {
                    continue; // Skip INITIAL, FINAL, DECISION, FORK, etc.
                }
                String laneName = lanes.stream()
                        .filter(l -> l.getId() != null && l.getId().equals(node.getLaneId()))
                        .map(Lane::getName)
                        .findFirst()
                        .orElse(null);
                activityDTOs.add(ActivityInfoDTO.builder()
                        .uuid(node.getUuid())
                        .name(node.getName())
                        .description(node.getDescription())
                        .laneId(node.getLaneId())
                        .laneName(laneName)
                        .build());
            }
        }

        AutoAssignPolicyRequestDTO req = AutoAssignPolicyRequestDTO.builder()
                .policyName(policy.getName())
                .activities(activityDTOs)
                .employees(employeeDTOs)
                .build();

        return aiIntegrationService.autoAssignPolicy(req);
    }

    public PolicyResponseDTO autoAssignPolicy(String policyUuid) {
        return autoAssignPolicy(policyUuid, null);
    }

    public PolicyResponseDTO autoAssignPolicy(String policyUuid, List<AutoAssignPolicyResponseDTO.ActivityAssignmentDTO> assignments) {
        Policy policy = policyRepository.findByUuid(policyUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + policyUuid));

        if (assignments != null && !assignments.isEmpty()) {
            if (policy.getActivityNodes() != null) {
                for (var assignment : assignments) {
                    policy.getActivityNodes().stream()
                            .filter(n -> assignment.getActivityUuid() != null && assignment.getActivityUuid().equals(n.getUuid()))
                            .findFirst()
                            .ifPresent(n -> n.setAssigneeId(assignment.getEmployeeUuid()));
                }
            }
            policyRepository.save(policy);
            return PolicyResponseDTO.fromEntity(policy);
        }

        // Get EMPLOYEE role id
        Role employeeRole = roleRepository.findByRoleName("Funcionario")
                .orElseThrow(() -> new ResourceNotFoundException("Rol 'Funcionario' no encontrado"));

        List<User> employees = userRepository.findByRoleId(employeeRole.getUuid());

        // Build employee metrics
        List<EmployeeInfoDTO> employeeDTOs = new ArrayList<>();
        for (User emp : employees) {
            int pendingTasks = policyInstanceRepository.findPendingTasks(emp.getUuid(), "EMPLOYEE").size();
            employeeDTOs.add(EmployeeInfoDTO.builder()
                    .uuid(emp.getUuid())
                    .name(emp.getName() + " " + emp.getLastname())
                    .roleName("Funcionario")
                    .currentPendingTasks(pendingTasks)
                    .avgCompletionHours(0.0)
                    .departmentId(emp.getDepartmentId())
                    .build());
        }

        // Build activity infos
        List<ActivityInfoDTO> activityDTOs = new ArrayList<>();
        List<Lane> lanes = policy.getLanes() != null ? policy.getLanes() : new ArrayList<>();
        if (policy.getActivityNodes() != null) {
            for (ActivityNode node : policy.getActivityNodes()) {
                if (!"ACTIVITY".equals(node.getState()) && !"APPROVAL".equals(node.getState())) {
                    continue; // Skip INITIAL, FINAL, etc.
                }
                String laneName = lanes.stream()
                        .filter(l -> l.getId() != null && l.getId().equals(node.getLaneId()))
                        .map(Lane::getName)
                        .findFirst()
                        .orElse(null);
                activityDTOs.add(ActivityInfoDTO.builder()
                        .uuid(node.getUuid())
                        .name(node.getName())
                        .description(node.getDescription())
                        .laneId(node.getLaneId())
                        .laneName(laneName)
                        .build());
            }
        }

        AutoAssignPolicyRequestDTO req = AutoAssignPolicyRequestDTO.builder()
                .policyName(policy.getName())
                .activities(activityDTOs)
                .employees(employeeDTOs)
                .build();

        AutoAssignPolicyResponseDTO aiResponse = aiIntegrationService.autoAssignPolicy(req);

        // Apply assignments to activity nodes
        if (aiResponse != null && aiResponse.getAssignments() != null) {
            for (var assignment : aiResponse.getAssignments()) {
                if (policy.getActivityNodes() != null) {
                    policy.getActivityNodes().stream()
                            .filter(n -> assignment.getActivityUuid().equals(n.getUuid()))
                            .findFirst()
                            .ifPresent(n -> n.setAssigneeId(assignment.getEmployeeUuid()));
                }
            }
        }

        policyRepository.save(policy);
        return PolicyResponseDTO.fromEntity(policy);
    }

    public PolicyResponseDTO sharePolicy(String policyId, List<String> collaboratorIds) {
        Policy policy = policyRepository.findByUuid(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("Politica no encontrada: " + policyId));

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + email));

        if (!policy.getOwnerId().equals(currentUser.getUuid())) {
            throw new RuntimeException("No tienes permisos para compartir esta politica");
        }

        policy.setVisibility("SHARED");
        policy.setCollaboratorIds(collaboratorIds);
        policyRepository.save(policy);

        return PolicyResponseDTO.fromEntity(policy);
    }

    public List<PolicyResponseDTO> getSharedWithMe() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + email));

        return policyRepository.findByCollaboratorIdsContaining(currentUser.getUuid()).stream()
                .map(PolicyResponseDTO::fromEntity)
                .toList();
    }

    public void delete(String uuid) {
        Policy policy = policyRepository.findByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("Política no encontrada: " + uuid));
        policyRepository.delete(policy);
    }
}
