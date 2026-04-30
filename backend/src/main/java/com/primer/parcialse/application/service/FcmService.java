package com.primer.parcialse.application.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FcmService {

    /**
     * Sends a push notification to a specific FCM device token.
     *
     * @param fcmToken the target device FCM token
     * @param title    notification title
     * @param body     notification body
     */
    public void sendToToken(String fcmToken, String title, String body) {
        if (fcmToken == null || fcmToken.isBlank())
            return;
        if (FirebaseApp.getApps().isEmpty()) {
            log.debug("Firebase not initialized, skipping push notification.");
            return;
        }
        try {
            Message message = Message.builder()
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .setToken(fcmToken)
                    .build();
            String response = FirebaseMessaging.getInstance().send(message);
            log.debug("FCM message sent: {}", response);
        } catch (Exception e) {
            log.warn("Failed to send FCM notification: {}", e.getMessage());
        }
    }
}
