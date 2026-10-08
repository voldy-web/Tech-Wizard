package com.techwizard.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.techwizard.dto.SettingsDto;
import com.techwizard.service.SettingsService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final SettingsService settings;
    public SettingsController(SettingsService settings) { this.settings = settings; }
    @GetMapping public SettingsDto get() { return settings.get(); }
    @PutMapping public SettingsDto put(@Valid @RequestBody SettingsDto d) { return settings.update(d); }
}
