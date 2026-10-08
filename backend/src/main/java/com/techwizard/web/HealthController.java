package com.techwizard.web;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lightweight ping the mobile app uses to detect an unreachable backend. */
@RestController
public class HealthController {
    @GetMapping("/api/health") public Map<String, String> health() { return Map.of("status", "UP"); }
}
