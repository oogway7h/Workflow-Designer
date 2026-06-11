package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.policy.HistoryTimelineDTO;
import com.primer.parcialse.application.dto.policy.InstanceDetailDTO;
import com.primer.parcialse.application.dto.policy.InstanceSummaryDTO;
import com.primer.parcialse.application.dto.policy.PendingTaskDTO;
import com.primer.parcialse.application.dto.policy.EmployeeDashboardDTO;
import com.primer.parcialse.domain.exception.ResourceNotFoundException;
import com.primer.parcialse.domain.model.ActivityNode;
import com.primer.parcialse.domain.model.HistoryItem;
import com.primer.parcialse.domain.model.RequiredDocument;
import com.primer.parcialse.domain.model.Policy;
import com.primer.parcialse.domain.model.PolicyInstance;
import com.primer.parcialse.domain.model.Role;
import com.primer.parcialse.domain.model.Transition;
import com.primer.parcialse.domain.model.User;
import com.primer.parcialse.infrastructure.repository.PolicyInstanceRepository;
import com.primer.parcialse.infrastructure.repository.PolicyRepository;
import com.primer.parcialse.infrastructure.repository.RoleRepository;
import com.primer.parcialse.infrastructure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final PolicyInstanceRepository policyInstanceRepository;
    private final PolicyRepository policyRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final WorkflowAnalyticsService workflowAnalyticsService;
    private final NotificationService notificationService;

    /**
     * Inicia una instancia de una polÃƒÂ­tica (workflow).
     * 
     * @param policyUuid UUID de la polÃƒÂ­tica
     * @param managerId  UUID del usuario gestor que la inicia
     * @return La instancia creada
     */
    public PolicyInstance startInstance(String policyUuid, String managerId) {
        Policy policy = policyRepository.findByUuid(policyUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Policy no encontrada con UUID: " + policyUuid));

        // Buscar el nodo inicial (nodo sin transiciones entrantes o simplemente el
        // primero si es secuencial)
        String initialActivityNodeId = findInitialActivityNode(policy);

        PolicyInstance instance = PolicyInstance.create(policy.getUuid(), managerId, initialActivityNodeId);

        assignNextNodesAssignee(instance, policy, initialActivityNodeId);

        PolicyInstance saved = policyInstanceRepository.save(instance);

        // Trigger: Reclamo — notificar al applicant que su trámite fue tomado
        if (saved.getApplicantId() != null) {
            notificationService.createNotification(
                    saved.getApplicantId(),
                    "Trámite iniciado",
                    "Un gestor ha tomado tu trámite y comenzará a procesarlo.",
                    "INFO",
                    saved.getUuid());
        }

        return saved;
    }

    /**
     * Completa una tarea en el flujo de trabajo (workflow).
     * 
     * @param instanceId ID u UUID de la instancia
     * @param assigneeId ID del usuario que completÃƒÂ³ la tarea
     * @param taskData   JSON con la data del formulario
     * @return Instancia actualizada
     */
    public PolicyInstance completeTask(String instanceId, String assigneeId, Map<String, Object> taskData) {
        PolicyInstance instance = policyInstanceRepository.findByUuid(instanceId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("PolicyInstance no encontrada con UUID: " + instanceId));

        if (!"ACTIVE".equals(instance.getStatus())) {
            throw new IllegalStateException("La instancia no estÃƒÂ¡ activa. Estado actual: " + instance.getStatus());
        }

        Policy policy = policyRepository.findByUuid(instance.getPolicyId())
                .orElseThrow(() -> new ResourceNotFoundException("Policy original no encontrada"));

        String currentActivityId = instance.getCurrentActivityNodeId();

        // 1. Validar el formSchemaJson (Simulado: sÃƒÂ³lo actualizamos instanceData por
        // ahora)
        if (taskData != null && !taskData.isEmpty()) {
            if (instance.getInstanceData() == null) {
                instance.setInstanceData(new HashMap<>());
            }
            instance.getInstanceData().putAll(taskData);
        }

        // 2. AÃƒÂ±adir al history
        HistoryItem historyItem = HistoryItem.create(currentActivityId, assigneeId, "COMPLETED", taskData);
        if (instance.getHistory() == null) {
            instance.setHistory(new ArrayList<>());
        }
        instance.getHistory().add(historyItem);

        // 3. Evaluar transiciones para hallar el siguiente nodo
        String nextActivityNodeId = evaluateNextNode(policy, currentActivityId, taskData, instance.getInstanceData());

        // 4. ActualizaciÃ³n / Cierre
        if (nextActivityNodeId == null) {
            instance.setStatus("COMPLETED");
            instance.setCurrentActivityNodeId(null);
            instance.setCurrentAssigneeId(null);
            instance.setCurrentAssigneeRole(null);
        } else {
            instance.setCurrentActivityNodeId(nextActivityNodeId);
            assignNextNodesAssignee(instance, policy, nextActivityNodeId);
        }

        instance.setUpdatedAt(Instant.now());
        PolicyInstance saved = policyInstanceRepository.save(instance);

        // Trigger: tarea completada → notificar al applicant del avance o conclusión del trámite
        if (saved.getApplicantId() != null) {
            String notificationTitle = "Avance en tu trámite";
            String notificationMessage;
            if ("COMPLETED".equals(saved.getStatus())) {
                notificationTitle = "Trámite completado";
                notificationMessage = "Tu trámite ha sido completado exitosamente.";
            } else {
                String completedTaskName = "";
                if (policy.getActivityNodes() != null) {
                    completedTaskName = policy.getActivityNodes().stream()
                            .filter(n -> currentActivityId.equals(n.getUuid()))
                            .map(n -> n.getName() != null && !n.getName().isBlank() ? n.getName() : n.getDescription())
                            .findFirst().orElse("");
                }
                notificationMessage = "Se completó la tarea: " + completedTaskName + ". Tu trámite ha avanzado.";
            }
            notificationService.createNotification(
                    saved.getApplicantId(),
                    notificationTitle,
                    notificationMessage,
                    "STATUS_CHANGED",
                    saved.getUuid());
        }

        // Trigger: siguiente tarea asignada → notificar al nuevo assignee
        if ("ACTIVE".equals(saved.getStatus()) && saved.getCurrentAssigneeId() != null
                && !saved.getCurrentAssigneeId().isEmpty()) {
            notificationService.createNotification(
                    saved.getCurrentAssigneeId(),
                    "Nueva tarea asignada",
                    "Se te ha asignado una nueva tarea en un trámite activo.",
                    "TASK_ASSIGNED",
                    saved.getUuid());
        }

        return saved;
    }

    private String findInitialActivityNode(Policy policy) {
        List<ActivityNode> nodes = policy.getActivityNodes();
        if (nodes == null || nodes.isEmpty()) {
            throw new IllegalStateException("La polÃƒÂ­tica no tiene actividades.");
        }

        List<Transition> transitions = policy.getTransitions() == null ? new java.util.ArrayList<>()
                : policy.getTransitions();

        // El primer nodo que no es target de ninguna transiciÃƒÂ³n
        for (ActivityNode node : nodes) {
            if (node.getUuid() == null)
                continue;
            boolean isTarget = transitions.stream()
                    .anyMatch(t -> node.getUuid().equals(t.getTargetActivityId()));
            if (!isTarget) {
                // Verificar si es un nodo de evento Start
                if ("INICIO".equalsIgnoreCase(node.getDescription()) || "START".equalsIgnoreCase(node.getState())
                        || "INITIAL".equalsIgnoreCase(node.getState())) {
                    return transitions.stream()
                            .filter(t -> node.getUuid().equals(t.getSourceActivityId()))
                            .map(t -> t.getTargetActivityId())
                            .findFirst()
                            .orElse(node.getUuid());
                }
                return node.getUuid();
            }
        }
        // Fallback: el primer nodo
        return nodes.get(0).getUuid();
    }

    private void assignNextNodesAssignee(PolicyInstance instance, Policy policy, String nodeId) {
        if (nodeId == null || policy.getActivityNodes() == null)
            return;

        ActivityNode node = policy.getActivityNodes().stream()
                .filter(n -> nodeId.equals(n.getUuid()))
                .findFirst().orElse(null);

        if (node != null) {
            instance.setCurrentAssigneeId(node.getAssigneeId());
            if (node.getLaneId() != null && !node.getLaneId().isEmpty()) {
                Role role = roleRepository.findByUuid(node.getLaneId()).orElse(null);
                if (role != null) {
                    instance.setCurrentAssigneeRole(role.getRoleName());
                } else {
                    instance.setCurrentAssigneeRole(node.getLaneId());
                }

                // AI Intelligent Routing if no specific assignee is set
                if (instance.getCurrentAssigneeId() == null || instance.getCurrentAssigneeId().isEmpty()) {
                    workflowAnalyticsService.assignTaskIntelligently(
                            instance.getUuid(),
                            node.getName(),
                            node.getLaneId());
                }

            } else {
                instance.setCurrentAssigneeRole(null);
            }
        }
    }

    private String evaluateNextNode(Policy policy, String currentActivityId, Map<String, Object> taskData,
            Map<String, Object> instanceData) {
        if (policy.getTransitions() == null) {
            return null;
        }

        String iterNodeId = currentActivityId;

        while (true) {
            final String sourceId = iterNodeId;
            List<Transition> outgoing = policy.getTransitions().stream()
                    .filter(t -> sourceId.equals(t.getSourceActivityId()))
                    .collect(Collectors.toList());

            if (outgoing.isEmpty()) {
                return null;
            }

            String nextNodeId = null;
            for (Transition transition : outgoing) {
                if (evaluateCondition(transition.getCondition(), taskData, instanceData)) {
                    nextNodeId = transition.getTargetActivityId();
                    break;
                }
            }

            if (nextNodeId == null) {
                return null;
            }

            final String targetId = nextNodeId;
            ActivityNode nextNode = policy.getActivityNodes().stream()
                    .filter(n -> targetId.equals(n.getUuid()))
                    .findFirst().orElse(null);

            if (nextNode != null && ("DECISION".equalsIgnoreCase(nextNode.getState())
                    || "OBJECT".equalsIgnoreCase(nextNode.getState())
                    || "SIGNAL".equalsIgnoreCase(nextNode.getState())
                    || "FORK".equalsIgnoreCase(nextNode.getState())
                    || "INITIAL".equalsIgnoreCase(nextNode.getState()))) {
                iterNodeId = targetId;
            } else {
                return nextNodeId;
            }
        }
    }

    private boolean evaluateCondition(String condition, Map<String, Object> taskData,
            Map<String, Object> instanceData) {
        if (condition == null || condition.trim().isEmpty()) {
            return true;
        }

        String lowerCond = condition.trim().toLowerCase();

        // 1. Deteccion de condiciones en texto simple (labels) usando el ultimo
        // formulario enviado (taskData)
        if ("aprobado".equals(lowerCond) || "true".equals(lowerCond) || "yes".equals(lowerCond)
                || "aceptado".equals(lowerCond)) {
            return hasAnyTrueBoolean(taskData);
        } else if ("rechazado".equals(lowerCond) || "false".equals(lowerCond) || "no".equals(lowerCond)
                || "denegado".equals(lowerCond)) {
            return !hasAnyTrueBoolean(taskData);
        }

        // 2. Fallback temporal por si se mapea el valor booleano desde instanceData
        // completo:
        return false;
    }

    private boolean hasAnyTrueBoolean(Map<String, Object> data) {
        if (data == null)
            return false;
        long booleanCount = 0;
        long trueCount = 0;
        for (Object value : data.values()) {
            if (value instanceof Boolean) {
                booleanCount++;
                if ((Boolean) value)
                    trueCount++;
            }
        }
        return trueCount > 0 || booleanCount == 0;
    }

    public List<PendingTaskDTO> getPendingTasks(String username) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));
        Role role = roleRepository.findByUuid(user.getRoleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role no encontrado"));

        List<PolicyInstance> instances = policyInstanceRepository.findPendingTasks(user.getUuid(), role.getRoleName());

        return instances.stream().map(inst -> {
            Policy policy = (inst.getPolicyId() != null) ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                    : null;
            User manager = (inst.getManagerId() != null) ? userRepository.findByUuid(inst.getManagerId()).orElse(null)
                    : null;

            String taskName = "Unknown";
            if (policy != null && inst.getCurrentActivityNodeId() != null && policy.getActivityNodes() != null) {
                taskName = policy.getActivityNodes().stream()
                        .filter(n -> inst.getCurrentActivityNodeId().equals(n.getUuid()))
                        .map(ActivityNode::getDescription)
                        .findFirst().orElse("Unknown");
            }

            return PendingTaskDTO.builder()
                    .instanceId(inst.getUuid())
                    .policyName(policy != null ? policy.getDescription() : "Desconocida")
                    .taskName(taskName)
                    .createdAt(inst.getCreatedAt())
                    .managerName(manager != null ? manager.getName() + " " + manager.getLastname() : "Desconocido")
                    .build();
        }).collect(Collectors.toList());
    }

    public List<InstanceSummaryDTO> getManagedInstances(String username, String status) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));

        List<PolicyInstance> instances = policyInstanceRepository.findByManagerIdOrderByUpdatedAtDesc(user.getUuid());

        if (status != null && !status.isEmpty()) {
            instances = instances.stream()
                    .filter(i -> status.equals(i.getStatus()))
                    .collect(Collectors.toList());
        }

        return instances.stream().map(inst -> {
            Policy policy = (inst.getPolicyId() != null) ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                    : null;

            String taskName = "Unknown";
            if (policy != null && inst.getCurrentActivityNodeId() != null && policy.getActivityNodes() != null) {
                taskName = policy.getActivityNodes().stream()
                        .filter(n -> inst.getCurrentActivityNodeId().equals(n.getUuid()))
                        .map(n -> n.getName() != null && !n.getName().isBlank() ? n.getName() : n.getDescription())
                        .findFirst().orElse("Unknown");
            }

            return InstanceSummaryDTO.builder()
                    .instanceId(inst.getUuid())
                    .policyName(policy != null ? policy.getDescription() : "Desconocida")
                    .status(inst.getStatus())
                    .currentTask(taskName)
                    .startedAt(inst.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    public Page<InstanceSummaryDTO> getAllInstances(Pageable pageable) {
        return policyInstanceRepository.findAll(pageable).map(inst -> {
            Policy policy = (inst.getPolicyId() != null) ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                    : null;

            String taskName = "Unknown";
            if (policy != null && inst.getCurrentActivityNodeId() != null && policy.getActivityNodes() != null) {
                taskName = policy.getActivityNodes().stream()
                        .filter(n -> inst.getCurrentActivityNodeId().equals(n.getUuid()))
                        .map(n -> n.getName() != null && !n.getName().isBlank() ? n.getName() : n.getDescription())
                        .findFirst().orElse("Unknown");
            }

            return InstanceSummaryDTO.builder()
                    .instanceId(inst.getUuid())
                    .policyName(policy != null ? policy.getDescription() : "Desconocida")
                    .status(inst.getStatus())
                    .currentTask(taskName)
                    .startedAt(inst.getCreatedAt())
                    .build();
        });
    }

    public InstanceDetailDTO getInstanceDetails(String instanceUuid) {
        PolicyInstance inst = policyInstanceRepository.findByUuid(instanceUuid)
                .orElseThrow(
                        () -> new ResourceNotFoundException("PolicyInstance no encontrada con UUID: " + instanceUuid));

        Policy policy = (inst.getPolicyId() != null) ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                : null;

        String taskName = "Unknown";
        String assigneeName = null;
        Map<String, Object> formSchemaJson = null;
        Boolean allowFileUpload = false;
        List<RequiredDocument> requiredDocuments = null;

        if (policy != null && inst.getCurrentActivityNodeId() != null && policy.getActivityNodes() != null) {
            ActivityNode currentNode = policy.getActivityNodes().stream()
                    .filter(n -> inst.getCurrentActivityNodeId().equals(n.getUuid()))
                    .findFirst().orElse(null);

            if (currentNode != null) {
                taskName = currentNode.getName() != null ? currentNode.getName() : currentNode.getDescription();
                formSchemaJson = currentNode.getFormSchemaJson();
                allowFileUpload = currentNode.getAllowFileUpload();
                requiredDocuments = currentNode.getRequiredDocuments();
                if (currentNode.getAssigneeId() != null) {
                    User assignee = userRepository.findByUuid(currentNode.getAssigneeId()).orElse(null);
                    if (assignee != null) {
                        assigneeName = assignee.getName() + " " + assignee.getLastname();
                    }
                }
            }
        }

        return InstanceDetailDTO.builder()
                .instanceId(inst.getUuid())
                .policyId(inst.getPolicyId())
                .policyName(policy != null ? policy.getDescription() : "Desconocida")
                .applicantId(inst.getApplicantId())
                .status(inst.getStatus())
                .currentTaskId(inst.getCurrentActivityNodeId())
                .currentTaskName(taskName)
                .currentTaskAssigneeName(assigneeName)
                .formSchemaJson(formSchemaJson)
                .instanceData(inst.getInstanceData())
                .startedAt(inst.getCreatedAt())
                .updatedAt(inst.getUpdatedAt())
                .allowFileUpload(allowFileUpload != null ? allowFileUpload : false)
                .requiredDocuments(requiredDocuments != null ? requiredDocuments : List.of())
                .build();
    }

    public List<HistoryTimelineDTO> getHistory(String username, String status) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));
        Role role = roleRepository.findByUuid(user.getRoleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role no encontrado"));

        List<PolicyInstance> instances;

        if ("ROLE_ADMIN".equals(role.getRoleName()) || "ADMIN".equals(role.getRoleName())) {
            instances = policyInstanceRepository.findAll();
        } else if ("ROLE_MANAGER".equals(role.getRoleName()) || "MANAGER".equals(role.getRoleName())) {
            instances = policyInstanceRepository.findByManagerIdOrderByUpdatedAtDesc(user.getUuid());
        } else {
            instances = policyInstanceRepository.findInstancesWithHistoryByAssigneeId(user.getUuid());
        }

        if (status != null && !status.isEmpty()) {
            instances = instances.stream()
                    .filter(i -> status.equals(i.getStatus()))
                    .collect(Collectors.toList());
        }

        return instances.stream()
                .filter(inst -> inst.getHistory() != null)
                .flatMap(inst -> inst.getHistory().stream()
                        .filter(h -> "ROLE_ADMIN".equals(role.getRoleName()) || "ADMIN".equals(role.getRoleName())
                                || "ROLE_MANAGER".equals(role.getRoleName()) || "MANAGER".equals(role.getRoleName())
                                || user.getUuid().equals(h.getAssigneeId()))
                        .map(historyItem -> {
                            User assignee = (historyItem.getAssigneeId() != null)
                                    ? userRepository.findByUuid(historyItem.getAssigneeId()).orElse(null)
                                    : null;
                            Policy policy = (inst.getPolicyId() != null)
                                    ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                                    : null;

                            String taskName = "Unknown";
                            if (policy != null && historyItem.getActivityNodeId() != null
                                    && policy.getActivityNodes() != null) {
                                taskName = policy.getActivityNodes().stream()
                                        .filter(n -> historyItem.getActivityNodeId().equals(n.getUuid()))
                                        .map(ActivityNode::getDescription)
                                        .findFirst().orElse(historyItem.getActivityNodeId());
                            }

                            return HistoryTimelineDTO.builder()
                                    .instanceId(inst.getUuid())
                                    .taskName(taskName)
                                    .action(historyItem.getAction())
                                    .completedBy(assignee != null ? assignee.getName() + " " + assignee.getLastname()
                                            : historyItem.getAssigneeId())
                                    .timestamp(historyItem.getTimestamp())
                                    .build();
                        }))
                .sorted((a, b) -> {
                    if (a.getTimestamp() == null)
                        return 1;
                    if (b.getTimestamp() == null)
                        return -1;
                    return b.getTimestamp().compareTo(a.getTimestamp());
                })
                .collect(Collectors.toList());
    }

    public PolicyInstance completeEmployeeTask(String instanceId, String username, Map<String, Object> taskData) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));
        return completeTask(instanceId, user.getUuid(), taskData);
    }

    public EmployeeDashboardDTO getEmployeeDashboard(String username) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));
        Role role = roleRepository.findByUuid(user.getRoleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role no encontrado"));

        long pendingCount = policyInstanceRepository.findPendingTasks(user.getUuid(), role.getRoleName()).size();

        List<PolicyInstance> completedInstances = policyInstanceRepository
                .findInstancesWithHistoryByAssigneeId(user.getUuid());
        long completedCount = completedInstances.stream()
                .filter(inst -> inst.getHistory() != null)
                .flatMap(inst -> inst.getHistory().stream())
                .filter(h -> user.getUuid().equals(h.getAssigneeId()) && "COMPLETED".equals(h.getAction()))
                .count();

        List<HistoryTimelineDTO> recentCompleted = getHistory(username, null).stream()
                .filter(item -> "COMPLETED".equals(item.getAction()))
                .limit(5)
                .collect(Collectors.toList());

        return EmployeeDashboardDTO.builder()
                .pendingTasksCount(pendingCount)
                .completedTasksCount(completedCount)
                .recentCompletedTasks(recentCompleted)
                .build();
    }

    public List<HistoryTimelineDTO> getInstanceHistory(String instanceUuid) {
        PolicyInstance inst = policyInstanceRepository.findByUuid(instanceUuid)
                .orElseThrow(
                        () -> new ResourceNotFoundException("PolicyInstance no encontrada con UUID: " + instanceUuid));

        Policy policy = (inst.getPolicyId() != null) ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                : null;

        if (inst.getHistory() == null)
            return new ArrayList<>();

        return inst.getHistory().stream().map(historyItem -> {
            User assignee = (historyItem.getAssigneeId() != null)
                    ? userRepository.findByUuid(historyItem.getAssigneeId()).orElse(null)
                    : null;

            String taskName = "Unknown";
            if (policy != null && historyItem.getActivityNodeId() != null
                    && policy.getActivityNodes() != null) {
                taskName = policy.getActivityNodes().stream()
                        .filter(n -> historyItem.getActivityNodeId().equals(n.getUuid()))
                        .map(ActivityNode::getDescription)
                        .findFirst().orElse(historyItem.getActivityNodeId());
            }

            return HistoryTimelineDTO.builder()
                    .instanceId(inst.getUuid())
                    .taskName(taskName)
                    .action(historyItem.getAction())
                    .completedBy(assignee != null ? assignee.getName() + " " + assignee.getLastname()
                            : historyItem.getAssigneeId())
                    .timestamp(historyItem.getTimestamp())
                    .build();
        }).sorted((a, b) -> {
            if (a.getTimestamp() == null)
                return 1;
            if (b.getTimestamp() == null)
                return -1;
            return b.getTimestamp().compareTo(a.getTimestamp());
        }).collect(Collectors.toList());
    }

    public PolicyInstance startExternalInstance(String policyUuid, String applicantUsername) {
        Policy policy = policyRepository.findByUuid(policyUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Policy no encontrada con UUID: " + policyUuid));

        User applicant = userRepository.findByEmail(applicantUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));

        PolicyInstance instance = PolicyInstance.builder()
                .uuid(java.util.UUID.randomUUID().toString())
                .policyId(policy.getUuid())
                .managerId(null)
                .applicantId(applicant.getUuid())
                .status("PENDING_ASSIGNMENT")
                .currentActivityNodeId(null)
                .instanceData(new HashMap<>())
                .history(new ArrayList<>())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return policyInstanceRepository.save(instance);
    }

    public List<InstanceSummaryDTO> getCustomerInstances(String username) {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));

        List<PolicyInstance> instances = policyInstanceRepository.findByApplicantId(user.getUuid());

        return instances.stream().map(inst -> {
            Policy policy = (inst.getPolicyId() != null) ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                    : null;

            String taskName = "Unknown";
            if (policy != null && inst.getCurrentActivityNodeId() != null && policy.getActivityNodes() != null) {
                taskName = policy.getActivityNodes().stream()
                        .filter(n -> inst.getCurrentActivityNodeId().equals(n.getUuid()))
                        .map(ActivityNode::getDescription)
                        .findFirst().orElse("Unknown");
            }

            return InstanceSummaryDTO.builder()
                    .instanceId(inst.getUuid())
                    .policyName(policy != null ? policy.getDescription() : "Desconocida")
                    .status(inst.getStatus())
                    .currentTask(taskName)
                    .startedAt(inst.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    public List<InstanceSummaryDTO> getIncomingInstances() {
        List<PolicyInstance> instances = policyInstanceRepository.findByManagerIdIsNull();

        return instances.stream().map(inst -> {
            Policy policy = (inst.getPolicyId() != null) ? policyRepository.findByUuid(inst.getPolicyId()).orElse(null)
                    : null;

            User applicant = (inst.getApplicantId() != null)
                    ? userRepository.findByUuid(inst.getApplicantId()).orElse(null)
                    : null;
            String applicantName = applicant != null ? applicant.getName() + " " + applicant.getLastname()
                    : "Desconocido";

            return InstanceSummaryDTO.builder()
                    .instanceId(inst.getUuid())
                    .policyName(policy != null ? policy.getDescription() : "Desconocida")
                    .status(inst.getStatus())
                    .currentTask(applicantName) // Reusing currentTask to display applicant name in UI
                    .startedAt(inst.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    public PolicyInstance claimInstance(String instanceUuid, String managerUsername) {
        User manager = userRepository.findByEmail(managerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User no encontrado"));

        PolicyInstance instance = policyInstanceRepository.findByUuid(instanceUuid)
                .orElseThrow(() -> new ResourceNotFoundException("PolicyInstance no encontrada"));

        Policy policy = policyRepository.findByUuid(instance.getPolicyId())
                .orElseThrow(() -> new ResourceNotFoundException("Policy no encontrada"));

        instance.setManagerId(manager.getUuid());
        instance.setStatus("ACTIVE");

        String initialNodeId = findInitialActivityNode(policy);
        instance.setCurrentActivityNodeId(initialNodeId);
        assignNextNodesAssignee(instance, policy, initialNodeId);

        HistoryItem historyItem = HistoryItem.create(null, manager.getUuid(), "CLAIM", new HashMap<>());
        if (instance.getHistory() == null) {
            instance.setHistory(new ArrayList<>());
        }
        instance.getHistory().add(historyItem);
        instance.setUpdatedAt(Instant.now());

        PolicyInstance saved = policyInstanceRepository.save(instance);

        // Notificar al solicitante que su trámite fue reclamado por un gestor
        if (saved.getApplicantId() != null) {
            notificationService.createNotification(
                    saved.getApplicantId(),
                    "Trámite reclamado",
                    "Un gestor ha reclamado tu trámite y comenzará a procesarlo.",
                    "STATUS_CHANGED",
                    saved.getUuid());
        }

        // Notificar al primer empleado asignado
        if (saved.getCurrentAssigneeId() != null && !saved.getCurrentAssigneeId().isEmpty()) {
            notificationService.createNotification(
                    saved.getCurrentAssigneeId(),
                    "Nueva tarea asignada",
                    "Se te ha asignado una tarea en un trámite recién reclamado.",
                    "TASK_ASSIGNED",
                    saved.getUuid());
        }

        return saved;
    }
}
