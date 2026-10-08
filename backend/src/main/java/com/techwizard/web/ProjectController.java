package com.techwizard.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.techwizard.dto.ClaimDto;
import com.techwizard.dto.ProjectDto;
import com.techwizard.service.ClaimService;
import com.techwizard.service.ProjectService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projects;
    private final ClaimService claims;

    public ProjectController(ProjectService projects, ClaimService claims) {
        this.projects = projects;
        this.claims = claims;
    }

    @GetMapping public List<ProjectDto> list() { return projects.list(); }
    @GetMapping("/{id}") public ProjectDto get(@PathVariable Long id) { return projects.get(id); }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ProjectDto create(@Valid @RequestBody ProjectDto d) { return projects.create(d); }

    @PutMapping("/{id}")
    public ProjectDto update(@PathVariable Long id, @Valid @RequestBody ProjectDto d) { return projects.update(id, d); }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { projects.delete(id); }

    @GetMapping("/{id}/claims")
    public List<ClaimDto> claims(@PathVariable Long id) { return claims.listForProject(id); }

    /** Auto-increments weekNumber and pre-fills Balance B/F from the previous claim. */
    @PostMapping("/{id}/claims") @ResponseStatus(HttpStatus.CREATED)
    public ClaimDto createClaim(@PathVariable Long id) { return claims.create(id); }
}
