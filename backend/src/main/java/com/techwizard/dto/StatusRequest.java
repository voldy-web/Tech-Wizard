package com.techwizard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.techwizard.model.ClaimStatus;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** amountPaid, when given, is the new cumulative total paid; the difference is logged as a payment. */
public record StatusRequest(
        @NotNull ClaimStatus status,
        String approvedBy,
        LocalDate approvedDate,
        @DecimalMin("0") BigDecimal amountPaid,
        LocalDate paymentDate,
        String paymentReference,
        String paymentNote) {}
