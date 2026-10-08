package com.techwizard.web;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class ApiFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    static final String ITEMS = """
        [
         {"type":"LUMP_SUM","description":"General Labour","amount":16050},
         {"type":"MEASURED","description":"Cement","qty":450,"unit":"Bags","rate":120.00},
         {"type":"MEASURED","description":"Sand","qty":1,"unit":"Load","rate":3000},
         {"type":"MEASURED","description":"Dust","qty":1,"unit":"Load","rate":5600},
         {"type":"MEASURED","description":"Stone","qty":4,"unit":"Loads","rate":4000},
         {"type":"LUMP_SUM","description":"Electricals","amount":7000},
         {"type":"LUMP_SUM","description":"Plumbing","amount":1500},
         {"type":"LUMP_SUM","description":"Steel Labour","amount":8000}
        ]""";

    private long id(String body) throws Exception { return json.readTree(body).get("id").asLong(); }

    @Test
    void fullFlow() throws Exception {
        String pBody = mvc.perform(post("/api/projects").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"East Legon Residential\",\"client\":\"Mr Osei\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.levyPercent").value(7.0))
            .andReturn().getResponse().getContentAsString();
        long pid = id(pBody);

        // week 1: auto numbered, B/F 0
        String c1Body = mvc.perform(post("/api/projects/" + pid + "/claims"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.weekNumber").value(1))
            .andExpect(jsonPath("$.reference").value("TW-ELR-001"))
            .andExpect(jsonPath("$.balanceBroughtForward").value(0.0))
            .andReturn().getResponse().getContentAsString();
        long c1 = id(c1Body);

        mvc.perform(put("/api/claims/" + c1).contentType(MediaType.APPLICATION_JSON)
                .content("{\"levyPercent\":7,\"balanceBroughtForward\":7734}"))
            .andExpect(status().isOk());

        mvc.perform(put("/api/claims/" + c1 + "/items").contentType(MediaType.APPLICATION_JSON).content(ITEMS))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.subTotal").value(111150.00))
            .andExpect(jsonPath("$.levy").value(7780.50))
            .andExpect(jsonPath("$.total").value(118930.50))
            .andExpect(jsonPath("$.grandTotal").value(126664.50))
            .andExpect(jsonPath("$.items", hasSize(8)));

        // measured amount typed by hand is ignored but flagged
        mvc.perform(put("/api/claims/" + c1 + "/items").contentType(MediaType.APPLICATION_JSON)
                .content("[{\"type\":\"MEASURED\",\"description\":\"Pump\",\"qty\":2,\"unit\":\"Days\",\"rate\":1500,\"amount\":3800}]"))
            .andExpect(jsonPath("$.subTotal").value(3000.00))
            .andExpect(jsonPath("$.items[0].amountMismatch").value(true))
            .andExpect(jsonPath("$.items[0].enteredAmount").value(3800.00));

        mvc.perform(put("/api/claims/" + c1 + "/items").contentType(MediaType.APPLICATION_JSON).content(ITEMS)).andExpect(status().isOk());

        // submit -> approve -> partial payment -> outstanding carries forward
        mvc.perform(patch("/api/claims/" + c1 + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUBMITTED\"}")).andExpect(status().isOk());
        mvc.perform(patch("/api/claims/" + c1 + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APPROVED\",\"approvedBy\":\"Kofi Osei\",\"amountPaid\":100000,\"paymentReference\":\"TXN-1\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("APPROVED"))
            .andExpect(jsonPath("$.amountPaid").value(100000.00))
            .andExpect(jsonPath("$.outstanding").value(26664.50))
            .andExpect(jsonPath("$.payments", hasSize(1)));

        // locked once approved
        mvc.perform(put("/api/claims/" + c1 + "/items").contentType(MediaType.APPLICATION_JSON).content(ITEMS))
            .andExpect(status().isConflict());

        // week 2 pre-fills B/F with previous outstanding
        mvc.perform(post("/api/projects/" + pid + "/claims"))
            .andExpect(jsonPath("$.weekNumber").value(2))
            .andExpect(jsonPath("$.balanceBroughtForward").value(26664.50));

        // settle -> PAID automatically
        mvc.perform(post("/api/claims/" + c1 + "/payments").contentType(MediaType.APPLICATION_JSON)
                .content("{\"amount\":26664.50}"))
            .andExpect(jsonPath("$.status").value("PAID"))
            .andExpect(jsonPath("$.outstanding").value(0.0));

        mvc.perform(post("/api/claims/" + c1 + "/duplicate")).andExpect(status().isCreated())
            .andExpect(jsonPath("$.weekNumber").value(3))
            .andExpect(jsonPath("$.status").value("DRAFT"))
            .andExpect(jsonPath("$.items", hasSize(8)));

        mvc.perform(get("/api/dashboard")).andExpect(status().isOk())
            .andExpect(jsonPath("$.claimed").value(118930.50))
            .andExpect(jsonPath("$.paid").value(126664.50));

        mvc.perform(get("/api/projects/" + pid + "/claims")).andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    void validationAndSettings() throws Exception {
        mvc.perform(post("/api/projects").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.name").exists());
        mvc.perform(get("/api/claims/99999")).andExpect(status().isNotFound());
        mvc.perform(get("/api/settings")).andExpect(jsonPath("$.currency").value("GH₵"))
            .andExpect(jsonPath("$.defaultLevyPercent").value(7.0));
        JsonNode s = json.readTree(mvc.perform(get("/api/settings")).andReturn().getResponse().getContentAsString());
        ((com.fasterxml.jackson.databind.node.ObjectNode) s).put("companyName", "Addae & Associates");
        mvc.perform(put("/api/settings").contentType(MediaType.APPLICATION_JSON).content(s.toString()))
            .andExpect(jsonPath("$.companyName").value("Addae & Associates"));
    }
}
