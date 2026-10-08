package com.techwizard.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;

/** Singleton row (id = 1). */
@Entity
public class Settings {
    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    private String companyName = "";
    private String tin;
    private String address;
    private String phone;
    private String email;
    private String bankDetails;

    /** Data URI (data:image/...;base64,...) or http URL. */
    @Column(columnDefinition = "text")
    private String logoUrl;
    @Column(columnDefinition = "text")
    private String signatureUrl;

    private String preparerName;
    private String preparerTitle;

    @Column(precision = 5, scale = 2)
    private BigDecimal defaultLevyPercent = new BigDecimal("7.00");
    private String currency = "GH₵";
    private boolean autoBalanceForward = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "settings_units", joinColumns = @JoinColumn(name = "settings_id"))
    @Column(name = "unit")
    private List<String> units = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "settings_common_items", joinColumns = @JoinColumn(name = "settings_id"))
    private List<CommonItem> commonItems = new ArrayList<>();

    public Long getId() { return id; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String v) { this.companyName = v; }
    public String getTin() { return tin; }
    public void setTin(String v) { this.tin = v; }
    public String getAddress() { return address; }
    public void setAddress(String v) { this.address = v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getBankDetails() { return bankDetails; }
    public void setBankDetails(String v) { this.bankDetails = v; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String v) { this.logoUrl = v; }
    public String getSignatureUrl() { return signatureUrl; }
    public void setSignatureUrl(String v) { this.signatureUrl = v; }
    public String getPreparerName() { return preparerName; }
    public void setPreparerName(String v) { this.preparerName = v; }
    public String getPreparerTitle() { return preparerTitle; }
    public void setPreparerTitle(String v) { this.preparerTitle = v; }
    public BigDecimal getDefaultLevyPercent() { return defaultLevyPercent; }
    public void setDefaultLevyPercent(BigDecimal v) { this.defaultLevyPercent = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public boolean isAutoBalanceForward() { return autoBalanceForward; }
    public void setAutoBalanceForward(boolean v) { this.autoBalanceForward = v; }
    public List<String> getUnits() { return units; }
    public void setUnits(List<String> v) { this.units = v; }
    public List<CommonItem> getCommonItems() { return commonItems; }
    public void setCommonItems(List<CommonItem> v) { this.commonItems = v; }
}
