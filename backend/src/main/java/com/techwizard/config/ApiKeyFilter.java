package com.techwizard.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Simple shared-secret protection for a publicly hosted API.
 * When techwizard.api-key (env API_KEY) is set, every /api/** request except /api/health
 * must carry the header  X-API-Key: <secret>.  CORS pre-flights are let through.
 * With no key configured (local development) the API stays open.
 */
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-API-Key";
    private final byte[] key;

    public ApiKeyFilter(@Value("${techwizard.api-key:}") String key) {
        this.key = key == null ? new byte[0] : key.trim().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return key.length == 0
                || !path.startsWith("/api/")
                || path.equals("/api/health")
                || HttpMethod.OPTIONS.matches(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String given = request.getHeader(HEADER);
        boolean ok = given != null && MessageDigest.isEqual(key, given.trim().getBytes(StandardCharsets.UTF_8));
        if (ok) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Missing or invalid API key.\"}");
    }
}
