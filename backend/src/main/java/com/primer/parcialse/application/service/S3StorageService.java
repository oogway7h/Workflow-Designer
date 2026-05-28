package com.primer.parcialse.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import java.time.Duration;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.util.UUID;

@Service
public class S3StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;

    public S3StorageService(
            @org.springframework.beans.factory.annotation.Autowired(required = false) S3Client s3Client,
            @org.springframework.beans.factory.annotation.Autowired(required = false) S3Presigner s3Presigner,
            @Value("${aws.s3.bucket-name:#{null}}") String bucketName) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
    }

    public String upload(MultipartFile file, String folder) throws IOException {
        if (s3Client == null) {
            throw new IllegalStateException("S3 client is not configured");
        }
        
        String filename = file.getOriginalFilename();
        String extension = "";
        if (filename != null && filename.contains(".")) {
            extension = filename.substring(filename.lastIndexOf("."));
        }
        
        String key = (folder != null && !folder.isEmpty() ? folder + "/" : "") + UUID.randomUUID().toString() + extension;
        
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .build();
                
        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.getBytes()));
        
        return key;
    }

    public byte[] download(String key) {
        if (s3Client == null) {
            throw new IllegalStateException("S3 client is not configured");
        }
        
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
                
        ResponseBytes<GetObjectResponse> objectBytes = s3Client.getObjectAsBytes(getObjectRequest);
        return objectBytes.asByteArray();
    }

    public void delete(String key) {
        if (s3Client == null) {
            System.err.println("S3 client is not configured. Skipping delete for key: " + key);
            return;
        }
        
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
                
        s3Client.deleteObject(deleteObjectRequest);
    }
    
    public String generatePresignedUrl(String key) {
        if (s3Presigner == null) {
            throw new IllegalStateException("S3 presigner is not configured");
        }
        
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
                
        GetObjectPresignRequest getObjectPresignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(60))
                .getObjectRequest(getObjectRequest)
                .build();
                
        PresignedGetObjectRequest presignedGetObjectRequest = 
                s3Presigner.presignGetObject(getObjectPresignRequest);
                
        return presignedGetObjectRequest.url().toString();
    }
}
