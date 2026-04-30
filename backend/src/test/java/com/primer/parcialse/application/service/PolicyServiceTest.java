package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.policy.PolicyRequestDTO;
import com.primer.parcialse.application.dto.policy.PolicyResponseDTO;
import com.primer.parcialse.domain.model.Policy;
import com.primer.parcialse.infrastructure.repository.PolicyRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PolicyServiceTest {

        @Mock
        private PolicyRepository policyRepository;

        @InjectMocks
        private PolicyService policyService;

        @Test
        void createShouldPersistownerId() {
                PolicyRequestDTO request = new PolicyRequestDTO(
                                "Nombre de Política",
                                "Politica de compras",
                                "manager-123",
                                "designer-456",
                                List.of(),
                                List.of(),
                                List.of());

                when(policyRepository.save(any(Policy.class))).thenAnswer(invocation -> invocation.getArgument(0));

                PolicyResponseDTO response = policyService.create(request);

                assertThat(response.getDescription()).isEqualTo("Politica de compras");
                assertThat(response.getManagerId()).isEqualTo("manager-123");
                assertThat(response.getOwnerId()).isEqualTo("designer-456");
                verify(policyRepository).save(any(Policy.class));
        }

        @Test
        void getAllByOwnerIdShouldReturnOnlyDesignerPolicies() {
                Policy firstPolicy = Policy.builder()
                                .uuid("policy-1")
                                .description("Primera")
                                .managerId("manager-1")
                                .ownerId("designer-1")
                                .state("DRAFT")
                                .build();

                Policy secondPolicy = Policy.builder()
                                .uuid("policy-2")
                                .description("Segunda")
                                .managerId("manager-2")
                                .ownerId("designer-1")
                                .state("ACTIVE")
                                .build();

                when(policyRepository.findByOwnerId("designer-1")).thenReturn(List.of(firstPolicy, secondPolicy));

                List<PolicyResponseDTO> response = policyService.getAllByOwnerId("designer-1");

                assertThat(response).hasSize(2);
                assertThat(response).extracting(PolicyResponseDTO::getOwnerId)
                                .containsOnly("designer-1");
        }

        @Test
        void updateShouldModifyownerId() {
                Policy existingPolicy = Policy.builder()
                                .uuid("policy-1")
                                .name("Nombre Original")
                                .description("Original")
                                .managerId("manager-1")
                                .ownerId("designer-old")
                                .state("DRAFT")
                                .build();

                PolicyRequestDTO request = new PolicyRequestDTO(
                                "Nombre Actualizado",
                                "Actualizada",
                                "manager-2",
                                "designer-new",
                                List.of(),
                                List.of(),
                                List.of());

                when(policyRepository.findByUuid("policy-1")).thenReturn(Optional.of(existingPolicy));
                when(policyRepository.save(any(Policy.class))).thenAnswer(invocation -> invocation.getArgument(0));

                PolicyResponseDTO response = policyService.update("policy-1", request);

                assertThat(response.getDescription()).isEqualTo("Actualizada");
                assertThat(response.getManagerId()).isEqualTo("manager-2");
                assertThat(response.getOwnerId()).isEqualTo("designer-new");
        }
}
