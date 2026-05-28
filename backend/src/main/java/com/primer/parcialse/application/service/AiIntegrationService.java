package com.primer.parcialse.application.service;

import com.primer.parcialse.application.dto.ai.AssistantRequestDTO;
import com.primer.parcialse.application.dto.ai.AssistantResponseDTO;
import com.primer.parcialse.application.dto.ai.AutoAssignPolicyRequestDTO;
import com.primer.parcialse.application.dto.ai.AutoAssignPolicyResponseDTO;
import com.primer.parcialse.application.dto.ai.BottleneckRequestDTO;
import com.primer.parcialse.application.dto.ai.BottleneckResponseDTO;
import com.primer.parcialse.application.dto.ai.GeneratePolicyRequestDTO;
import com.primer.parcialse.application.dto.ai.ModifyDiagramRequestDTO;
import com.primer.parcialse.application.dto.ai.RoutingRequestDTO;
import com.primer.parcialse.application.dto.ai.RoutingResponseDTO;
import com.primer.parcialse.application.dto.ai.NlpIntentRequestDTO;
import com.primer.parcialse.application.dto.ai.NlpIntentResponseDTO;
import com.primer.parcialse.application.dto.ai.NlpNavigateRequestDTO;
import com.primer.parcialse.application.dto.ai.NlpNavigateResponseDTO;
import com.primer.parcialse.application.dto.ai.NlpFillFormRequestDTO;
import com.primer.parcialse.application.dto.ai.NlpFillFormResponseDTO;
import com.primer.parcialse.domain.exception.AiServiceUnavailableException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class AiIntegrationService {

    private final RestTemplate restTemplate;

    @Value("${ai.microservice.url}")
    private String aiMicroserviceUrl;

    public AssistantResponseDTO getAssistantSuggestion(AssistantRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/assistant/chat", req, AssistantResponseDTO.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }

    public RoutingResponseDTO getOptimalAssignee(RoutingRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/routing", req, RoutingResponseDTO.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }

    public BottleneckResponseDTO analyzeBottlenecks(BottleneckRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/analytics/bottlenecks", req,
                    BottleneckResponseDTO.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }

    public Object generatePolicy(GeneratePolicyRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/generate-policy", req, Object.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }

    public Object modifyDiagram(ModifyDiagramRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/modify-diagram", req, Object.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error al comunicarse con la IA para modificar diagrama", e);
        }
    }

    public NlpIntentResponseDTO nlpIntent(NlpIntentRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/nlp/intent", req, NlpIntentResponseDTO.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }

    public NlpNavigateResponseDTO nlpNavigate(NlpNavigateRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/nlp/navigate", req, NlpNavigateResponseDTO.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }

    public NlpFillFormResponseDTO nlpFillForm(NlpFillFormRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/nlp/fill-form", req, NlpFillFormResponseDTO.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }

    public AutoAssignPolicyResponseDTO autoAssignPolicy(AutoAssignPolicyRequestDTO req) {
        try {
            return restTemplate.postForObject(aiMicroserviceUrl + "/workflows/auto-assign-policy", req,
                    AutoAssignPolicyResponseDTO.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Error de timeout o indisponibilidad en la IA", e);
        }
    }
}
