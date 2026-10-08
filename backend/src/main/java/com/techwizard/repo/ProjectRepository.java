package com.techwizard.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.techwizard.model.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findAllByOrderByCreatedAtDesc();
}
