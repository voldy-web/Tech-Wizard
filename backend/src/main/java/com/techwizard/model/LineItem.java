package com.techwizard.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class LineItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;

    private int sortOrder;
    @Column(length = 500)
    private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private ItemType type = ItemType.MEASURED;
    @Column(precision = 19, scale = 3)
    private BigDecimal qty;
    private String unit;
    @Column(precision = 19, scale = 2)
    private BigDecimal rate;
    /** Authoritative amount: qty x rate for MEASURED, the entered value for LUMP_SUM. */
    @Column(precision = 19, scale = 2)
    private BigDecimal amount;
    /** What the user typed for a MEASURED row (kept only to flag a mismatch). */
    @Column(precision = 19, scale = 2)
    private BigDecimal enteredAmount;
    @Column(length = 500)
    private String remarks;

    public Long getId() { return id; }
    public Claim getClaim() { return claim; }
    public void setClaim(Claim v) { this.claim = v; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int v) { this.sortOrder = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public ItemType getType() { return type; }
    public void setType(ItemType v) { this.type = v; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal v) { this.qty = v; }
    public String getUnit() { return unit; }
    public void setUnit(String v) { this.unit = v; }
    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal v) { this.rate = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { this.amount = v; }
    public BigDecimal getEnteredAmount() { return enteredAmount; }
    public void setEnteredAmount(BigDecimal v) { this.enteredAmount = v; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String v) { this.remarks = v; }
}
