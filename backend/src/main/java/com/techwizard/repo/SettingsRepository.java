package com.techwizard.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techwizard.model.Settings;

public interface SettingsRepository extends JpaRepository<Settings, Long> {}
