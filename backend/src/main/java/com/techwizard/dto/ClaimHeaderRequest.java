package com.techwizard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

public record ClaimHeaderRequest(
        @Min(1) Integer weekNumber,
        LocalDate periodFrom,
        LocalDate periodTo,
        String preparedBy,
        LocalDate datePrepared,
        @DecimalMin("0") @DecimalMax("100") BigDecimal levyPercent,
        BigDecimal balanceBroughtForward,
        String notes) {}
