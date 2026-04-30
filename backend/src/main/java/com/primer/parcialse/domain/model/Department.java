package com.primer.parcialse.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.UUID;

/**
 * Entidad principal Department.
 * Representa un departamento de la organización.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "departments")
public class Department {

    @Id
    private String id;

    private String uuid;
    private String name;

    public static Department create(String name) {
        return Department.builder()
                .uuid(UUID.randomUUID().toString())
                .name(name)
                .build();
    }
}
