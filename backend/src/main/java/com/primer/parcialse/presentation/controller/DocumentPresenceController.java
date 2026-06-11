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

    // Relay spreadsheet cell selection changes
    @MessageMapping("/spreadsheet/{docId}/selection")
    @SendTo("/topic/spreadsheet/{docId}/selection")
    public String relaySpreadsheetSelection(@DestinationVariable String docId, String selection) {
        return selection;
    }

    // Relay spreadsheet cell value changes
    @MessageMapping("/spreadsheet/{docId}/cell-change")
    @SendTo("/topic/spreadsheet/{docId}/cell-change")
    public String relaySpreadsheetCellChange(@DestinationVariable String docId, String cellChange) {
        return cellChange;
    }

    // Relay spreadsheet structural changes (add/delete row/col)
    @MessageMapping("/spreadsheet/{docId}/structure")
    @SendTo("/topic/spreadsheet/{docId}/structure")
    public String relaySpreadsheetStructure(@DestinationVariable String docId, String structureChange) {
        return structureChange;
    }

    // Relay spreadsheet state sync messages (REQUEST_STATE / FULL_STATE)
    @MessageMapping("/spreadsheet/{docId}/sync")
    @SendTo("/topic/spreadsheet/{docId}/sync")
    public String relaySpreadsheetSync(@DestinationVariable String docId, String syncMessage) {
        return syncMessage;
    }
}
