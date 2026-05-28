package com.primer.parcialse.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class S3Config {
    @Value("${aws.access-key:#{null}}") private String accessKey;
    @Value("${aws.secret-key:#{null}}") private String secretKey;
    @Value("${aws.s3.region:us-east-1}") private String region;

    @Bean
    public S3Client s3Client() {
        if (accessKey == null || accessKey.trim().isEmpty() || secretKey == null || secretKey.trim().isEmpty()) {
            System.err.println("WARNING: AWS S3 credentials are not configured. S3 Storage will not work.");
            return null; // O un mock client para desarrollo si se prefiere
        }
        return S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)))
            .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        if (accessKey == null || accessKey.trim().isEmpty() || secretKey == null || secretKey.trim().isEmpty()) {
            return null;
        }
        return S3Presigner.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)))
            .build();
    }
}
