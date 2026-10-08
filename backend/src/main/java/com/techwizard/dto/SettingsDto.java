package com.techwizard.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record SettingsDto(
        String companyName,
        String tin,
        String address,
        String phone,
        String email,
        String bankDetails,
        String logoUrl,
        String signatureUrl,
        String preparerName,
        String preparerTitle,
        @DecimalMin("0") @DecimalMax("100") BigDecimal defaultLevyPercent,
        String currency,
        Boolean autoBalanceForward,
        List<String> units,
        @Valid List<CommonItemDto> commonItems) {}
