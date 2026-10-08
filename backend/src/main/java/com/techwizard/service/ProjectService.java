package com.techwizard.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.techwizard.calc.ClaimCalculator;
import com.techwizard.dto.ProjectDto;
import com.techwizard.model.Claim;
import com.techwizard.model.ClaimStatus;
import com.techwizard.model.Project;
import com.techwizard.repo.ClaimRepository;
import com.techwizard.repo.ProjectRepository;
import com.techwizard.web.NotFoundException;

@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projects;
    private final ClaimRepository claims;
    private final ClaimService claimService;
    private final SettingsService settings;

    public ProjectService(ProjectRepository projects, ClaimRepository claims, ClaimService claimService, SettingsService settings) {
        this.projects = projects;
        this.claims = claims;
        this.claimService = claimService;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public List<ProjectDto> list() { return projects.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList(); }

    @Transactional(readOnly = true)
    public ProjectDto get(Long id) { return toDto(require(id)); }

    public ProjectDto create(ProjectDto d) {
        Project p = new Project();
        apply(p, d);
        if (p.getLevyPercent() == null) p.setLevyPercent(settings.entity().getDefaultLevyPercent());
        return toDto(projects.save(p));
    }

    public ProjectDto update(Long id, ProjectDto d) {
        Project p = require(id);
        apply(p, d);
        return toDto(projects.save(p));
    }

    public void delete(Long id) {
        Project p = require(id);
        claims.deleteByProjectId(id);
        projects.delete(p);
    }

    private void apply(Project p, ProjectDto d) {
        p.setName(d.name());
        p.setClient(d.client());
        p.setScopeOfWork(d.scopeOfWork());
        p.setLocation(d.location());
        p.setLevyPercent(d.levyPercent());
        p.setContractSum(d.contractSum() == null ? null : ClaimCalculator.money(d.contractSum()));
    }

    Project require(Long id) { return projects.findById(id).orElseThrow(() -> new NotFoundException("Project", id)); }

    /** Roll-ups: claimed counts the current-period total of non-draft claims; outstanding is the latest claim's balance. */
    ProjectDto toDto(Project p) {
        List<Claim> all = claims.findByProjectIdOrderByWeekNumberDesc(p.getId());
        BigDecimal claimed = BigDecimal.ZERO, paid = BigDecimal.ZERO;
        for (Claim c : all) {
            if (c.getStatus() != ClaimStatus.DRAFT) claimed = claimed.add(claimService.totalsOf(c).total());
            paid = paid.add(c.getAmountPaid());
        }
        BigDecimal outstanding = BigDecimal.ZERO;
        for (Claim c : all) {   // newest non-draft claim carries the running balance
            if (c.getStatus() != ClaimStatus.DRAFT) {
                outstanding = ClaimCalculator.money(claimService.totalsOf(c).grandTotal().subtract(c.getAmountPaid()));
                break;
            }
        }
        return ProjectDto.of(p, all.size(), ClaimCalculator.money(claimed), ClaimCalculator.money(paid), outstanding);
    }
}
