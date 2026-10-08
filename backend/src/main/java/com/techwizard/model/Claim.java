package com.techwizard.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "weekNumber"}))
public class Claim {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id")
    private Project project;

    private int weekNumber;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String preparedBy;
    private LocalDate datePrepared;

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private ClaimStatus status = ClaimStatus.DRAFT;

    @Column(precision = 5, scale = 2)
    private BigDecimal levyPercent = new BigDecimal("7.00");
    @Column(precision = 19, scale = 2)
    private BigDecimal balanceBroughtForward = BigDecimal.ZERO.setScale(2);

    private String approvedBy;
    private LocalDate approvedDate;
    @Column(precision = 19, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO.setScale(2);
    private LocalDate paymentDate;
    private String paymentReference;
    @Column(length = 4000)
    private String notes;

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<LineItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "claim", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<Payment> payments = new ArrayList<>();

    public Long getId() { return id; }
    public Project getProject() { return project; }
    public void setProject(Project v) { this.project = v; }
    public int getWeekNumber() { return weekNumber; }
    public void setWeekNumber(int v) { this.weekNumber = v; }
    public LocalDate getPeriodFrom() { return periodFrom; }
    public void setPeriodFrom(LocalDate v) { this.periodFrom = v; }
    public LocalDate getPeriodTo() { return periodTo; }
    public void setPeriodTo(LocalDate v) { this.periodTo = v; }
    public String getPreparedBy() { return preparedBy; }
    public void setPreparedBy(String v) { this.preparedBy = v; }
    public LocalDate getDatePrepared() { return datePrepared; }
    public void setDatePrepared(LocalDate v) { this.datePrepared = v; }
    public ClaimStatus getStatus() { return status; }
    public void setStatus(ClaimStatus v) { this.status = v; }
    public BigDecimal getLevyPercent() { return levyPercent; }
    public void setLevyPercent(BigDecimal v) { this.levyPercent = v; }
    public BigDecimal getBalanceBroughtForward() { return balanceBroughtForward; }
    public void setBalanceBroughtForward(BigDecimal v) { this.balanceBroughtForward = v; }
    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String v) { this.approvedBy = v; }
    public LocalDate getApprovedDate() { return approvedDate; }
    public void setApprovedDate(LocalDate v) { this.approvedDate = v; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal v) { this.amountPaid = v; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate v) { this.paymentDate = v; }
    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String v) { this.paymentReference = v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }
    public List<LineItem> getItems() { return items; }
    public List<Payment> getPayments() { return payments; }
}
