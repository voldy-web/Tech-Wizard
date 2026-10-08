package com.techwizard.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.techwizard.calc.ClaimCalculator;
import com.techwizard.calc.ClaimCalculator.Row;
import com.techwizard.calc.ClaimCalculator.Totals;
import com.techwizard.dto.ClaimDto;
import com.techwizard.dto.ClaimHeaderRequest;
import com.techwizard.dto.LineItemDto;
import com.techwizard.dto.PaymentDto;
import com.techwizard.dto.StatusRequest;
import com.techwizard.model.Claim;
import com.techwizard.model.ClaimStatus;
import com.techwizard.model.ItemType;
import com.techwizard.model.LineItem;
import com.techwizard.model.Payment;
import com.techwizard.model.Project;
import com.techwizard.model.Settings;
import com.techwizard.repo.ClaimRepository;
import com.techwizard.repo.PaymentRepository;
import com.techwizard.repo.ProjectRepository;
import com.techwizard.web.ConflictException;
import com.techwizard.web.NotFoundException;

@Service
@Transactional
public class ClaimService {

    private final ClaimRepository claims;
    private final ProjectRepository projects;
    private final PaymentRepository paymentRepo;
    private final SettingsService settings;
    private final ClaimCalculator calc;

    public ClaimService(ClaimRepository claims, ProjectRepository projects, PaymentRepository paymentRepo,
                        SettingsService settings, ClaimCalculator calc) {
        this.paymentRepo = paymentRepo;
        this.claims = claims;
        this.projects = projects;
        this.settings = settings;
        this.calc = calc;
    }

    // ---------- reads ----------

    @Transactional(readOnly = true)
    public List<ClaimDto> listAll() {
        return claims.findAllByOrderByIdDesc().stream().map(c -> toDto(c, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<ClaimDto> listByStatus(List<ClaimStatus> statuses) {
        return claims.findByStatusInOrderByIdDesc(statuses).stream().map(c -> toDto(c, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<ClaimDto> listForProject(Long projectId) {
        requireProject(projectId);
        return claims.findByProjectIdOrderByWeekNumberDesc(projectId).stream().map(c -> toDto(c, false)).toList();
    }

    @Transactional(readOnly = true)
    public ClaimDto get(Long id) { return toDto(require(id), true); }

    // ---------- create / duplicate ----------

    public ClaimDto create(Long projectId) {
        Project p = requireProject(projectId);
        Settings s = settings.entity();
        Claim last = claims.findFirstByProjectIdOrderByWeekNumberDesc(projectId).orElse(null);
        Claim c = new Claim();
        c.setProject(p);
        c.setWeekNumber(claims.maxWeek(projectId) + 1);
        LocalDate from = last != null && last.getPeriodTo() != null ? last.getPeriodTo().plusDays(1) : LocalDate.now();
        c.setPeriodFrom(from);
        c.setPeriodTo(from.plusDays(6));
        c.setDatePrepared(LocalDate.now());
        c.setPreparedBy(s.getPreparerName());
        c.setLevyPercent(p.getLevyPercent() != null ? p.getLevyPercent() : s.getDefaultLevyPercent());
        c.setBalanceBroughtForward(s.isAutoBalanceForward() ? carryForward(last) : ClaimCalculator.money(null));
        return toDto(claims.save(c), true);
    }

    public ClaimDto duplicate(Long id) {
        Claim src = require(id);
        Long projectId = src.getProject().getId();
        Claim last = claims.findFirstByProjectIdOrderByWeekNumberDesc(projectId).orElse(src);
        Settings s = settings.entity();
        Claim c = new Claim();
        c.setProject(src.getProject());
        c.setWeekNumber(claims.maxWeek(projectId) + 1);
        LocalDate from = last.getPeriodTo() != null ? last.getPeriodTo().plusDays(1) : LocalDate.now();
        c.setPeriodFrom(from);
        c.setPeriodTo(from.plusDays(6));
        c.setDatePrepared(LocalDate.now());
        c.setPreparedBy(src.getPreparedBy());
        c.setLevyPercent(src.getLevyPercent());
        c.setNotes(src.getNotes());
        c.setBalanceBroughtForward(s.isAutoBalanceForward() ? carryForward(last) : ClaimCalculator.money(null));
        for (LineItem li : src.getItems()) {
            LineItem n = new LineItem();
            n.setClaim(c);
            n.setSortOrder(li.getSortOrder());
            n.setDescription(li.getDescription());
            n.setType(li.getType());
            n.setQty(li.getQty());
            n.setUnit(li.getUnit());
            n.setRate(li.getRate());
            n.setAmount(li.getAmount());
            n.setRemarks(li.getRemarks());
            c.getItems().add(n);
        }
        return toDto(claims.save(c), true);
    }

    /** Previous claim's outstanding balance, never negative. */
    private BigDecimal carryForward(Claim last) {
        if (last == null) return ClaimCalculator.money(null);
        BigDecimal out = calc.outstanding(totalsOf(last).grandTotal(), last.getAmountPaid());
        return out.signum() < 0 ? ClaimCalculator.money(null) : out;
    }

    // ---------- edit ----------

    public ClaimDto updateHeader(Long id, ClaimHeaderRequest r) {
        Claim c = requireEditable(id);
        if (r.weekNumber() != null) c.setWeekNumber(r.weekNumber());
        if (r.periodFrom() != null) c.setPeriodFrom(r.periodFrom());
        if (r.periodTo() != null) c.setPeriodTo(r.periodTo());
        if (r.periodFrom() != null && r.periodTo() != null && r.periodTo().isBefore(r.periodFrom())) {
            throw new IllegalArgumentException("periodTo must not be before periodFrom");
        }
        c.setPreparedBy(r.preparedBy());
        if (r.datePrepared() != null) c.setDatePrepared(r.datePrepared());
        if (r.levyPercent() != null) c.setLevyPercent(r.levyPercent());
        if (r.balanceBroughtForward() != null) c.setBalanceBroughtForward(ClaimCalculator.money(r.balanceBroughtForward()));
        c.setNotes(r.notes());
        return toDto(claims.saveAndFlush(c), true);
    }

    public ClaimDto replaceItems(Long id, List<LineItemDto> dtos) {
        Claim c = requireEditable(id);
        c.getItems().clear();
        claims.flush();
        int order = 0;
        for (LineItemDto d : dtos) {
            LineItem li = new LineItem();
            li.setClaim(c);
            li.setSortOrder(order++);
            li.setDescription(d.description());
            li.setType(d.type());
            li.setUnit(d.type() == ItemType.LUMP_SUM ? "Item" : d.unit());
            li.setRemarks(d.remarks());
            if (d.type() == ItemType.LUMP_SUM) {
                li.setQty(BigDecimal.ONE);
                li.setRate(null);
                li.setAmount(ClaimCalculator.money(d.amount()));
                li.setEnteredAmount(null);
            } else {
                li.setQty(d.qty());
                li.setRate(d.rate() == null ? null : ClaimCalculator.money(d.rate()));
                BigDecimal computed = calc.rowAmount(new Row(false, d.qty(), d.rate(), null));
                li.setAmount(computed);
                BigDecimal entered = d.enteredAmount() != null ? d.enteredAmount() : d.amount();
                li.setEnteredAmount(entered != null && ClaimCalculator.money(entered).compareTo(computed) != 0
                        ? ClaimCalculator.money(entered) : null);
            }
            c.getItems().add(li);
        }
        return toDto(claims.saveAndFlush(c), true);
    }

    public void delete(Long id) {
        Claim c = require(id);
        if (c.getStatus() == ClaimStatus.PAID) throw new ConflictException("A paid claim cannot be deleted.");
        claims.delete(c);
    }

    // ---------- status & payments ----------

    public ClaimDto changeStatus(Long id, StatusRequest r) {
        Claim c = require(id);
        c.setStatus(r.status());
        if (r.status() == ClaimStatus.APPROVED || r.status() == ClaimStatus.PAID) {
            if (r.approvedBy() != null) c.setApprovedBy(r.approvedBy());
            if (r.approvedDate() != null) c.setApprovedDate(r.approvedDate());
            if (c.getApprovedDate() == null) c.setApprovedDate(LocalDate.now());
            BigDecimal grand = totalsOf(c).grandTotal();
            BigDecimal paid = c.getAmountPaid();
            BigDecimal target = r.amountPaid() != null ? ClaimCalculator.money(r.amountPaid())
                    : (r.status() == ClaimStatus.PAID ? grand : paid);
            if (target.compareTo(paid) < 0) {
                throw new IllegalArgumentException("amountPaid cannot be lower than what is already logged; remove a payment instead.");
            }
            if (target.compareTo(paid) > 0) {
                addPayment(c, target.subtract(paid), r.paymentDate(), r.paymentReference(), r.paymentNote());
            }
        } else {
            c.setApprovedBy(null);
            c.setApprovedDate(null);
        }
        syncPaidStatus(c);
        return toDto(claims.saveAndFlush(c), true);
    }

    public ClaimDto logPayment(Long id, PaymentDto p) {
        Claim c = require(id);
        if (c.getStatus() != ClaimStatus.APPROVED && c.getStatus() != ClaimStatus.PAID) {
            throw new ConflictException("Payments can only be logged against an approved claim.");
        }
        addPayment(c, p.amount(), p.paymentDate(), p.reference(), p.note());
        syncPaidStatus(c);
        return toDto(claims.saveAndFlush(c), true);
    }

    public ClaimDto removePayment(Long id, Long paymentId) {
        Claim c = require(id);
        boolean removed = c.getPayments().removeIf(x -> x.getId().equals(paymentId));
        if (!removed) throw new NotFoundException("Payment", paymentId);
        recomputePaid(c);
        if (c.getStatus() == ClaimStatus.PAID && c.getAmountPaid().compareTo(totalsOf(c).grandTotal()) < 0) {
            c.setStatus(ClaimStatus.APPROVED);
        }
        return toDto(claims.saveAndFlush(c), true);
    }

    private void addPayment(Claim c, BigDecimal amount, LocalDate date, String ref, String note) {
        Payment p = new Payment();
        p.setClaim(c);
        p.setAmount(ClaimCalculator.money(amount));
        p.setPaymentDate(date != null ? date : LocalDate.now());
        p.setReference(ref);
        p.setNote(note);
        c.getPayments().add(paymentRepo.save(p));
        recomputePaid(c);
    }

    private void recomputePaid(Claim c) {
        BigDecimal sum = BigDecimal.ZERO;
        for (Payment p : c.getPayments()) sum = sum.add(p.getAmount());
        c.setAmountPaid(ClaimCalculator.money(sum));
        Payment last = c.getPayments().isEmpty() ? null : c.getPayments().get(c.getPayments().size() - 1);
        c.setPaymentDate(last == null ? null : last.getPaymentDate());
        c.setPaymentReference(last == null ? null : last.getReference());
    }

    /** Fully settled approved claims become PAID automatically. */
    private void syncPaidStatus(Claim c) {
        BigDecimal grand = totalsOf(c).grandTotal();
        if (c.getStatus() == ClaimStatus.APPROVED && grand.signum() > 0 && c.getAmountPaid().compareTo(grand) >= 0) {
            c.setStatus(ClaimStatus.PAID);
        }
    }

    // ---------- helpers & mapping ----------

    Claim require(Long id) { return claims.findById(id).orElseThrow(() -> new NotFoundException("Claim", id)); }

    private Claim requireEditable(Long id) {
        Claim c = require(id);
        if (c.getStatus() == ClaimStatus.APPROVED || c.getStatus() == ClaimStatus.PAID) {
            throw new ConflictException("An approved or paid claim is locked. Move it back to DRAFT to edit.");
        }
        return c;
    }

    private Project requireProject(Long id) { return projects.findById(id).orElseThrow(() -> new NotFoundException("Project", id)); }

    public Totals totalsOf(Claim c) {
        List<Row> rows = new ArrayList<>();
        for (LineItem li : c.getItems()) {
            rows.add(new Row(li.getType() == ItemType.LUMP_SUM, li.getQty(), li.getRate(), li.getAmount()));
        }
        return calc.totals(rows, c.getLevyPercent(), c.getBalanceBroughtForward());
    }

    static String initials(String name) {
        if (name == null || name.isBlank()) return "PRJ";
        StringBuilder sb = new StringBuilder();
        for (String w : name.trim().split("\\s+")) {
            if (Character.isLetterOrDigit(w.charAt(0))) sb.append(w.charAt(0));
            if (sb.length() == 3) break;
        }
        return sb.toString().toUpperCase(Locale.ROOT);
    }

    public ClaimDto toDto(Claim c, boolean withItems) {
        Totals t = totalsOf(c);
        Project p = c.getProject();
        List<LineItemDto> items = null;
        List<PaymentDto> pays = null;
        if (withItems) {
            items = c.getItems().stream().map(li -> new LineItemDto(li.getId(), li.getSortOrder(), li.getDescription(),
                    li.getType(), li.getQty(), li.getUnit(), li.getRate(), li.getAmount(), li.getEnteredAmount(),
                    li.getEnteredAmount() != null, li.getRemarks())).toList();
            pays = c.getPayments().stream().map(x -> new PaymentDto(x.getId(), x.getAmount(), x.getPaymentDate(),
                    x.getReference(), x.getNote())).toList();
        }
        return new ClaimDto(c.getId(), p.getId(), p.getName(), p.getClient(), p.getScopeOfWork(), p.getLocation(),
                "TW-" + initials(p.getName()) + "-" + String.format("%03d", c.getWeekNumber()),
                c.getWeekNumber(), c.getPeriodFrom(), c.getPeriodTo(), c.getPreparedBy(), c.getDatePrepared(),
                c.getStatus(), c.getLevyPercent(), c.getBalanceBroughtForward(), c.getApprovedBy(), c.getApprovedDate(),
                c.getAmountPaid(), c.getPaymentDate(), c.getPaymentReference(), c.getNotes(),
                t.subTotal(), t.levy(), t.total(), t.grandTotal(), calc.outstanding(t.grandTotal(), c.getAmountPaid()),
                items, pays);
    }
}
