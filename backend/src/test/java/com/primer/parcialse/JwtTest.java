package com.primer.parcialse;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;
import java.util.Map;
import java.util.Date;

public class JwtTest {
    public static void main(String[] args) {
        String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        var key = Keys.hmacShaKeyFor(keyBytes);
        
        String token = Jwts.builder()
                .claims(Map.of("role", "MANAGER"))
                .subject("test@test.com")
                .signWith(key)
                .compact();
                
        var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        System.out.println("Role extracted: " + claims.get("role", String.class));
    }
}
