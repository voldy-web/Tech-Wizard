package com.techwizard.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;

public record CommonItemDto(@NotBlank String description, String unit, BigDecimal defaultRate, String note) {}
