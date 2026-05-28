package com.primer.parcialse.presentation.controller;

import lombok.Data;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class DocumentPresenceController {

    @Data
    public static class PresenceMessage {
        private String userId;
        private String userName;
        private String action; // "JOIN" or "LEAVE"
    }

    @MessageMapping("/document/{docId}/join")
    @SendTo("/topic/document/{docId}/presence")
    public PresenceMessage join(@DestinationVariable String docId, PresenceMessage msg) {
        msg.setAction("JOIN");
        return msg;
    }

    @MessageMapping("/document/{docId}/leave")
    @SendTo("/topic/document/{docId}/presence")
    public PresenceMessage leave(@DestinationVariable String docId, PresenceMessage msg) {
        msg.setAction("LEAVE");
        return msg;
    }

    // Relay Yjs CRDT updates for collaborative editing
    @MessageMapping("/document/{docId}/edit")
    @SendTo("/topic/document/{docId}/edits")
    public String relayEdit(@DestinationVariable String docId, String update) {
        return update;
    }

    // Relay cursor/awareness updates for collaborative editing
    @MessageMapping("/document/{docId}/awareness")
    @SendTo("/topic/document/{docId}/awareness")
    public String relayAwareness(@DestinationVariable String docId, String awareness) {
        return awareness;
    }
}
