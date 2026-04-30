package com.primer.parcialse.infrastructure.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${app.firebase.credentials-path:firebase-service-account.json}")
    private String credentialsPath;

    @PostConstruct
    public void initialize() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        try {
            InputStream serviceAccount = resolveCredentials();
            if (serviceAccount == null) {
                log.warn("Firebase credentials not found at '{}'. Push notifications will be disabled.",
                        credentialsPath);
                return;
            }
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase initialized successfully.");
        } catch (IOException e) {
            log.warn("Failed to initialize Firebase: {}. Push notifications will be disabled.", e.getMessage());
        }
    }

    private InputStream resolveCredentials() {
        // Try classpath first, then filesystem
        InputStream stream = getClass().getClassLoader().getResourceAsStream(credentialsPath);
        if (stream != null)
            return stream;
        try {
            return new FileInputStream(credentialsPath);
        } catch (IOException e) {
            return null;
        }
    }
}
