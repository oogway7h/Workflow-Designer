package com.primer.parcialse.presentation.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class WorkflowWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    public WorkflowWebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/policy/{policyId}/node.moved")
    public void handleNodeMoved(@DestinationVariable String policyId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/policy/" + policyId, wrapEvent("NODE_MOVED", payload));
    }

    @MessageMapping("/policy/{policyId}/node.added")
    public void handleNodeAdded(@DestinationVariable String policyId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/policy/" + policyId, wrapEvent("NODE_ADDED", payload));
    }

    @MessageMapping("/policy/{policyId}/node.deleted")
    public void handleNodeDeleted(@DestinationVariable String policyId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/policy/" + policyId, wrapEvent("NODE_DELETED", payload));
    }

    @MessageMapping("/policy/{policyId}/transition.added")
    public void handleTransitionAdded(@DestinationVariable String policyId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/policy/" + policyId, wrapEvent("TRANSITION_ADDED", payload));
    }

    @MessageMapping("/policy/{policyId}/cursor.moved")
    public void handleCursorMoved(@DestinationVariable String policyId, @Payload Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/policy/" + policyId, wrapEvent("CURSOR_MOVED", payload));
    }

    private Map<String, Object> wrapEvent(String type, Map<String, Object> payload) {
        return Map.of("type", type, "payload", payload);
    }
}
