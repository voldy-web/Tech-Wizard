package com.techwizard.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.techwizard.calc.ClaimCalculator;
import com.techwizard.dto.ClaimDto;
import com.techwizard.dto.DashboardDto;
import com.techwizard.model.Claim;
import com.techwizard.model.ClaimStatus;
import com.techwizard.repo.ClaimRepository;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final ClaimRepository claims;
    private final ClaimService claimService;
    private final ProjectService projectService;

    public DashboardService(ClaimRepository claims, ClaimService claimService, ProjectService projectService) {
        this.claims = claims;
        this.claimService = claimService;
        this.projectService = projectService;
    }

    /**
     * claimed     = current-period totals of every non-draft claim (B/F excluded so it is never double counted)
     * approved    = same, for APPROVED and PAID claims
     * paid        = payments received
     * outstanding = claimed - paid
     */
    public DashboardDto get() {
        List<Claim> all = claims.findAllByOrderByIdDesc();
        BigDecimal claimed = BigDecimal.ZERO, approved = BigDecimal.ZERO, paid = BigDecimal.ZERO;
        int submitted = 0;
        for (Claim c : all) {
            BigDecimal total = claimService.totalsOf(c).total();
            paid = paid.add(c.getAmountPaid());
            if (c.getStatus() != ClaimStatus.DRAFT) claimed = claimed.add(total);
            if (c.getStatus() == ClaimStatus.APPROVED || c.getStatus() == ClaimStatus.PAID) approved = approved.add(total);
            if (c.getStatus() != ClaimStatus.DRAFT) submitted++;
        }
        List<ClaimDto> recent = all.stream().limit(5).map(c -> claimService.toDto(c, false)).toList();
        var projectList = projectService.list();
        return new DashboardDto(ClaimCalculator.money(claimed), ClaimCalculator.money(approved), ClaimCalculator.money(paid),
                ClaimCalculator.money(claimed.subtract(paid)), all.size(), submitted, projectList.size(), projectList, recent);
    }
}
