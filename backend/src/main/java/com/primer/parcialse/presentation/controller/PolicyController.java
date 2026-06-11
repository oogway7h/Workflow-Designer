package com.primer.parcialse.presentation.controller;

import com.primer.parcialse.application.dto.policy.PolicyDiagramDTO;
import com.primer.parcialse.application.dto.policy.PolicyRequestDTO;
import com.primer.parcialse.application.dto.policy.PolicyResponseDTO;
import com.primer.parcialse.application.dto.ai.AutoAssignPolicyResponseDTO;
import com.primer.parcialse.application.service.PolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/policies")
@RequiredArgsConstructor
@Tag(name = "Policies", description = "API para gestión de políticas de workflow")
public class PolicyController {

    private final PolicyService policyService;

    @PostMapping
    @Operation(summary = "Crear una nueva política", description = "Crea una nueva política de workflow con sus nodos y transiciones")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Política creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos de entrada inválidos")
    })
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<PolicyResponseDTO> create(@Valid @RequestBody PolicyRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(policyService.create(request));
    }

    @GetMapping
    @Operation(summary = "Obtener todas las políticas", description = "Retorna una lista de todas las políticas disponibles")
    @ApiResponse(responseCode = "200", description = "Lista de políticas obtenida exitosamente")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<List<PolicyResponseDTO>> getAll() {
        return ResponseEntity.ok(policyService.getAll());
    }

    @GetMapping("/external")
    @Operation(summary = "Obtener políticas externas", description = "Retorna una lista de políticas disponibles para clientes (EXTERNAL)")
    @ApiResponse(responseCode = "200", description = "Lista de políticas externas obtenida exitosamente")
    public ResponseEntity<List<PolicyResponseDTO>> getExternalPolicies() {
        return ResponseEntity.ok(policyService.getExternalPolicies());
    }

    @GetMapping("/owner/{ownerId}")
    @Operation(summary = "Obtener políticas por diseñador", description = "Retorna las políticas creadas por un usuario diseñador específico")
    @ApiResponse(responseCode = "200", description = "Lista de políticas del diseñador obtenida exitosamente")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<List<PolicyResponseDTO>> getAllByOwner(@PathVariable String ownerId) {
        return ResponseEntity.ok(policyService.getAllByOwnerId(ownerId));
    }

    @GetMapping("/manager/{managerId}")
    @Operation(summary = "Obtener políticas por gestor", description = "Retorna las políticas asignadas a un usuario gestor específico")
    @ApiResponse(responseCode = "200", description = "Lista de políticas del gestor obtenida exitosamente")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<List<PolicyResponseDTO>> getAllByManager(@PathVariable String managerId) {
        return ResponseEntity.ok(policyService.getAllByManagerId(managerId));
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<PolicyResponseDTO> getByUuid(@PathVariable String uuid) {
        return ResponseEntity.ok(policyService.getByUuid(uuid));
    }

    @PutMapping("/{uuid}")
    public ResponseEntity<PolicyResponseDTO> update(@PathVariable String uuid,
            @Valid @RequestBody PolicyRequestDTO request) {
        return ResponseEntity.ok(policyService.update(uuid, request));
    }

    @PatchMapping("/{uuid}/state")
    public ResponseEntity<PolicyResponseDTO> updateState(@PathVariable String uuid,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(policyService.updateState(uuid, body.get("state")));
    }

    @PutMapping("/{uuid}/diagram")
    public ResponseEntity<PolicyResponseDTO> updateDiagram(@PathVariable String uuid,
            @Valid @RequestBody PolicyDiagramDTO diagramDTO) {
        return ResponseEntity.ok(policyService.updateDiagram(uuid, diagramDTO));
    }

    @PostMapping("/{policyId}/activities/{activityId}/assign")
    @Operation(summary = "Asignar un funcionario a una actividad", description = "Asigna o transfiere un usuario a una actividad en una política")
    @ApiResponse(responseCode = "200", description = "Asignación realizada correctamente")
    @SecurityRequirement(name = "Bearer Authentication")
    public ResponseEntity<PolicyResponseDTO> assignUserToActivity(
            @PathVariable String policyId,
            @PathVariable String activityId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(policyService.assignActivityUser(policyId, activityId, body.get("userId")));
    }

    @PostMapping("/{policyUuid}/auto-assign")
    @Operation(summary = "Asignación automática con IA", description = "Usa IA para asignar automáticamente empleados a las actividades de la política")
    @SecurityRequirement(name = "Bearer Authentication")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'DESIGNER')")
    public ResponseEntity<PolicyResponseDTO> autoAssignPolicy(
            @PathVariable String policyUuid,
            @RequestBody(required = false) List<AutoAssignPolicyResponseDTO.ActivityAssignmentDTO> assignments) {
        return ResponseEntity.ok(policyService.autoAssignPolicy(policyUuid, assignments));
    }

    @GetMapping("/{policyUuid}/recommend-assignees")
    public ResponseEntity<AutoAssignPolicyResponseDTO> recommendAssignees(@PathVariable String policyUuid) {
        return ResponseEntity.ok(policyService.getAutoAssignRecommendations(policyUuid));
    }

    @PutMapping("/{policyId}/share")
    public ResponseEntity<PolicyResponseDTO> sharePolicy(@PathVariable String policyId,
            @RequestBody Map<String, List<String>> body) {
        return ResponseEntity.ok(policyService.sharePolicy(policyId, body.get("collaboratorIds")));
    }

    @GetMapping("/shared-with-me")
    public ResponseEntity<List<PolicyResponseDTO>> getSharedWithMe() {
        return ResponseEntity.ok(policyService.getSharedWithMe());
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Void> delete(@PathVariable String uuid) {
        policyService.delete(uuid);
        return ResponseEntity.noContent().build();
    }
}
