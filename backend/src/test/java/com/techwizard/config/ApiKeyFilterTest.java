package com.techwizard.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "techwizard.api-key=s3cret")
@AutoConfigureMockMvc
class ApiKeyFilterTest {

    @Autowired MockMvc mvc;

    @Test
    void rejectsMissingOrWrongKey() throws Exception {
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Missing or invalid API key."));
        mvc.perform(get("/api/projects").header("X-API-Key", "nope")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/settings")).andExpect(status().isUnauthorized());
    }

    @Test
    void acceptsCorrectKey() throws Exception {
        mvc.perform(get("/api/projects").header("X-API-Key", "s3cret")).andExpect(status().isOk());
        mvc.perform(get("/api/projects").header("X-API-Key", "  s3cret ")).andExpect(status().isOk());
    }

    @Test
    void healthAndPreflightStayOpen() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk());
        mvc.perform(options("/api/projects").header("Origin", "http://x").header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isOk());
    }
}
