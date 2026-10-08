package com.techwizard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardDto(
        BigDecimal claimed,
        BigDecimal approved,
        BigDecimal paid,
        BigDecimal outstanding,
        int claimCount,
        int submittedCount,
        int projectCount,
        List<ProjectDto> projects,
        List<ClaimDto> recentClaims) {}
