package com.techwizard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.techwizard.model.ClaimStatus;

/** Read model. Totals are always server-calculated. items is null on list endpoints. */
public record ClaimDto(
        Long id,
        Long projectId,
        String projectName,
        String client,
        String scopeOfWork,
        String location,
        String reference,
        int weekNumber,
        LocalDate periodFrom,
        LocalDate periodTo,
        String preparedBy,
        LocalDate datePrepared,
        ClaimStatus status,
        BigDecimal levyPercent,
        BigDecimal balanceBroughtForward,
        String approvedBy,
        LocalDate approvedDate,
        BigDecimal amountPaid,
        LocalDate paymentDate,
        String paymentReference,
        String notes,
        BigDecimal subTotal,
        BigDecimal levy,
        BigDecimal total,
        BigDecimal grandTotal,
        BigDecimal outstanding,
        List<LineItemDto> items,
        List<PaymentDto> payments) {}
