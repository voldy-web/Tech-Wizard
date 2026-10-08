package com.techwizard.config;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.techwizard.dto.ClaimDto;
import com.techwizard.dto.LineItemDto;
import com.techwizard.dto.ProjectDto;
import com.techwizard.dto.StatusRequest;
import com.techwizard.model.ClaimStatus;
import com.techwizard.model.ItemType;
import com.techwizard.service.ClaimService;
import com.techwizard.service.ProjectService;

/** Run with --techwizard.seed-demo=true (or env TECHWIZARD_SEED_DEMO=true) to get sample data on an empty database. */
@Component
@ConditionalOnProperty(name = "techwizard.seed-demo", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    private final ProjectService projects;
    private final ClaimService claims;

    public DemoDataSeeder(ProjectService projects, ClaimService claims) {
        this.projects = projects;
        this.claims = claims;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!projects.list().isEmpty()) return;
        ProjectDto p = projects.create(new ProjectDto(null, "East Legon Residential Complex", "Mr. Kofi Osei",
                "4-Storey Reinforced Concrete Framing, Masonry and Structural Finishes",
                "Plot 42, Ambassadorial Enclave, East Legon", new BigDecimal("7"), new BigDecimal("1250000"),
                null, null, null, null, null));
        ClaimDto c = claims.create(p.id());
        claims.updateHeader(c.id(), new com.techwizard.dto.ClaimHeaderRequest(1, c.periodFrom(), c.periodTo(),
                "Kwame Addae", c.datePrepared(), new BigDecimal("7"), new BigDecimal("7734"), null));
        claims.replaceItems(c.id(), List.of(
                item(ItemType.LUMP_SUM, "General Labour", null, null, null, "16050"),
                item(ItemType.MEASURED, "Portland Cement (Grade 42.5R)", "450", "Bags", "120.00", null),
                item(ItemType.MEASURED, "Sharp Sand", "1", "Load", "3000", null),
                item(ItemType.MEASURED, "Quarry Dust", "1", "Load", "5600", null),
                item(ItemType.MEASURED, "Stone (20mm)", "4", "Loads", "4000", null),
                item(ItemType.LUMP_SUM, "Electricals", null, null, null, "7000"),
                item(ItemType.LUMP_SUM, "Plumbing", null, null, null, "1500"),
                item(ItemType.LUMP_SUM, "Steel Labour", null, null, null, "8000")));
        claims.changeStatus(c.id(), new StatusRequest(ClaimStatus.APPROVED, "Kofi Osei", null,
                new BigDecimal("100000"), null, "TXN-GH-992140", "First instalment"));
        claims.create(p.id());
    }

    private static LineItemDto item(ItemType t, String d, String qty, String unit, String rate, String amount) {
        return new LineItemDto(null, null, d, t, qty == null ? null : new BigDecimal(qty), unit,
                rate == null ? null : new BigDecimal(rate), amount == null ? null : new BigDecimal(amount),
                null, null, null);
    }
}
