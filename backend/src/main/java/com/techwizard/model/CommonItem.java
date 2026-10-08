package com.techwizard.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Quick-add catalogue entry (a "unit rate"). */
@Embeddable
public class CommonItem {
    @Column(length = 200)
    private String description;
    @Column(length = 30)
    private String unit;
    @Column(precision = 19, scale = 2)
    private BigDecimal defaultRate;
    @Column(length = 200)
    private String note;

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getDefaultRate() { return defaultRate; }
    public void setDefaultRate(BigDecimal defaultRate) { this.defaultRate = defaultRate; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
