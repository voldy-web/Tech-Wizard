package com.techwizard.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.techwizard.dto.ClaimDto;
import com.techwizard.dto.ClaimHeaderRequest;
import com.techwizard.dto.LineItemDto;
import com.techwizard.dto.PaymentDto;
import com.techwizard.dto.StatusRequest;
import com.techwizard.model.ClaimStatus;
import com.techwizard.service.ClaimService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private final ClaimService claims;

    public ClaimController(ClaimService claims) { this.claims = claims; }

    /** Optional ?status=SUBMITTED,APPROVED filter. */
    @GetMapping
    public List<ClaimDto> list(@RequestParam(required = false) List<ClaimStatus> status) {
        return status == null || status.isEmpty() ? claims.listAll() : claims.listByStatus(status);
    }

    @GetMapping("/{id}") public ClaimDto get(@PathVariable Long id) { return claims.get(id); }

    @PutMapping("/{id}")
    public ClaimDto update(@PathVariable Long id, @Valid @RequestBody ClaimHeaderRequest r) { return claims.updateHeader(id, r); }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { claims.delete(id); }

    @PutMapping("/{id}/items")
    public ClaimDto items(@PathVariable Long id, @Valid @RequestBody List<@Valid LineItemDto> items) { return claims.replaceItems(id, items); }

    @PostMapping("/{id}/duplicate") @ResponseStatus(HttpStatus.CREATED)
    public ClaimDto duplicate(@PathVariable Long id) { return claims.duplicate(id); }

    @PatchMapping("/{id}/status")
    public ClaimDto status(@PathVariable Long id, @Valid @RequestBody StatusRequest r) { return claims.changeStatus(id, r); }

    @PostMapping("/{id}/payments") @ResponseStatus(HttpStatus.CREATED)
    public ClaimDto addPayment(@PathVariable Long id, @Valid @RequestBody PaymentDto p) { return claims.logPayment(id, p); }

    @DeleteMapping("/{id}/payments/{paymentId}")
    public ClaimDto removePayment(@PathVariable Long id, @PathVariable Long paymentId) { return claims.removePayment(id, paymentId); }
}
