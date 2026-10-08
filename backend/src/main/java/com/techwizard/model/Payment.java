package com.techwizard.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

/** One payment tranche received against a claim (the payment audit log). */
@Entity
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;
    @Column(precision = 19, scale = 2, nullable = false)
    private BigDecimal amount;
    private LocalDate paymentDate;
    private String reference;
    @Column(length = 500)
    private String note;

    public Long getId() { return id; }
    public Claim getClaim() { return claim; }
    public void setClaim(Claim v) { this.claim = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { this.amount = v; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate v) { this.paymentDate = v; }
    public String getReference() { return reference; }
    public void setReference(String v) { this.reference = v; }
    public String getNote() { return note; }
    public void setNote(String v) { this.note = v; }
}
