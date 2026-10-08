package com.techwizard.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.techwizard.calc.ClaimCalculator;
import com.techwizard.dto.CommonItemDto;
import com.techwizard.dto.SettingsDto;
import com.techwizard.model.CommonItem;
import com.techwizard.model.Settings;
import com.techwizard.repo.SettingsRepository;

@Service
public class SettingsService {

    private final SettingsRepository repo;

    public SettingsService(SettingsRepository repo) { this.repo = repo; }

    @Transactional
    public Settings entity() {
        return repo.findById(Settings.SINGLETON_ID).orElseGet(() -> repo.save(defaults()));
    }

    @Transactional
    public SettingsDto get() { return toDto(entity()); }

    @Transactional
    public SettingsDto update(SettingsDto d) {
        Settings s = entity();
        if (d.companyName() != null) s.setCompanyName(d.companyName());
        s.setTin(d.tin());
        s.setAddress(d.address());
        s.setPhone(d.phone());
        s.setEmail(d.email());
        s.setBankDetails(d.bankDetails());
        s.setLogoUrl(d.logoUrl());
        s.setSignatureUrl(d.signatureUrl());
        s.setPreparerName(d.preparerName());
        s.setPreparerTitle(d.preparerTitle());
        if (d.defaultLevyPercent() != null) s.setDefaultLevyPercent(d.defaultLevyPercent());
        if (d.currency() != null && !d.currency().isBlank()) s.setCurrency(d.currency());
        if (d.autoBalanceForward() != null) s.setAutoBalanceForward(d.autoBalanceForward());
        if (d.units() != null) s.setUnits(new ArrayList<>(d.units()));
        if (d.commonItems() != null) {
            List<CommonItem> items = new ArrayList<>();
            for (CommonItemDto c : d.commonItems()) {
                CommonItem ci = new CommonItem();
                ci.setDescription(c.description());
                ci.setUnit(c.unit());
                ci.setDefaultRate(c.defaultRate() == null ? null : ClaimCalculator.money(c.defaultRate()));
                ci.setNote(c.note());
                items.add(ci);
            }
            s.setCommonItems(items);
        }
        return toDto(repo.save(s));
    }

    static SettingsDto toDto(Settings s) {
        List<CommonItemDto> items = s.getCommonItems().stream()
                .map(c -> new CommonItemDto(c.getDescription(), c.getUnit(), c.getDefaultRate(), c.getNote())).toList();
        return new SettingsDto(s.getCompanyName(), s.getTin(), s.getAddress(), s.getPhone(), s.getEmail(),
                s.getBankDetails(), s.getLogoUrl(), s.getSignatureUrl(), s.getPreparerName(), s.getPreparerTitle(),
                s.getDefaultLevyPercent(), s.getCurrency(), s.isAutoBalanceForward(),
                List.copyOf(s.getUnits()), items);
    }

    private static Settings defaults() {
        Settings s = new Settings();
        s.setDefaultLevyPercent(new BigDecimal("7.00"));
        s.setUnits(new ArrayList<>(List.of("Item", "Bags", "Loads", "m³", "m²", "m", "Tons", "Days", "No.", "Lot")));
        s.setCommonItems(new ArrayList<>(List.of(
                common("General Labour", "Days", "80.00", "Daily site crew unit"),
                common("Cement (50kg)", "Bags", "110.00", "Grade 42.5R high strength"),
                common("Sand", "Loads", "3000.00", "Double-axle tipper"),
                common("Stone (20mm)", "Loads", "4000.00", "Quarry washed aggregate"),
                common("Rebar Bending", "Tons", "450.00", "Fabrication & placement"))));
        return s;
    }

    private static CommonItem common(String d, String u, String r, String n) {
        CommonItem c = new CommonItem();
        c.setDescription(d); c.setUnit(u); c.setDefaultRate(new BigDecimal(r)); c.setNote(n);
        return c;
    }
}
