package com.techwizard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record PaymentDto(
        Long id,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        LocalDate paymentDate,
        String reference,
        String note) {}
