package com.techwizard.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.techwizard.model.Project;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

public record ProjectDto(
        Long id,
        @NotBlank String name,
        String client,
        String scopeOfWork,
        String location,
        @DecimalMin("0") @DecimalMax("100") BigDecimal levyPercent,
        @DecimalMin("0") BigDecimal contractSum,
        LocalDateTime createdAt,
        // read-only roll-ups
        Integer claimCount,
        BigDecimal totalClaimed,
        BigDecimal totalPaid,
        BigDecimal outstanding) {

    public static ProjectDto of(Project p, int claimCount, BigDecimal claimed, BigDecimal paid, BigDecimal outstanding) {
        return new ProjectDto(p.getId(), p.getName(), p.getClient(), p.getScopeOfWork(), p.getLocation(),
                p.getLevyPercent(), p.getContractSum(), p.getCreatedAt(), claimCount, claimed, paid, outstanding);
    }
}
