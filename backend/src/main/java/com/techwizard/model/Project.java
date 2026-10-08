package com.techwizard.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;

@Entity
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    private String client;
    @Column(length = 2000)
    private String scopeOfWork;
    private String location;
    @Column(precision = 5, scale = 2)
    private BigDecimal levyPercent;
    @Column(precision = 19, scale = 2)
    private BigDecimal contractSum;
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getClient() { return client; }
    public void setClient(String v) { this.client = v; }
    public String getScopeOfWork() { return scopeOfWork; }
    public void setScopeOfWork(String v) { this.scopeOfWork = v; }
    public String getLocation() { return location; }
    public void setLocation(String v) { this.location = v; }
    public BigDecimal getLevyPercent() { return levyPercent; }
    public void setLevyPercent(BigDecimal v) { this.levyPercent = v; }
    public BigDecimal getContractSum() { return contractSum; }
    public void setContractSum(BigDecimal v) { this.contractSum = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
