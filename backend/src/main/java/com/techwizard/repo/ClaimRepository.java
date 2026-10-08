package com.techwizard.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.techwizard.model.Claim;
import com.techwizard.model.ClaimStatus;

public interface ClaimRepository extends JpaRepository<Claim, Long> {
    List<Claim> findByProjectIdOrderByWeekNumberDesc(Long projectId);
    Optional<Claim> findFirstByProjectIdOrderByWeekNumberDesc(Long projectId);
    List<Claim> findAllByOrderByIdDesc();
    List<Claim> findByStatusInOrderByIdDesc(List<ClaimStatus> statuses);
    void deleteByProjectId(Long projectId);

    @Query("select coalesce(max(c.weekNumber), 0) from Claim c where c.project.id = :projectId")
    int maxWeek(Long projectId);
}
