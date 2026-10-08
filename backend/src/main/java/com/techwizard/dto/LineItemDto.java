package com.techwizard.dto;

import java.math.BigDecimal;

import com.techwizard.model.ItemType;

import jakarta.validation.constraints.NotNull;

/**
 * For MEASURED rows the server ignores "amount" as a source of truth: amount = qty x rate.
 * If the client sent an amount that differs, it is echoed as enteredAmount and amountMismatch=true.
 */
public record LineItemDto(
        Long id,
        Integer sortOrder,
        String description,
        @NotNull ItemType type,
        BigDecimal qty,
        String unit,
        BigDecimal rate,
        BigDecimal amount,
        BigDecimal enteredAmount,
        Boolean amountMismatch,
        String remarks) {}
