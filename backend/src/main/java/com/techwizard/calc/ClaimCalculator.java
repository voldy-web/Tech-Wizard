package com.techwizard.calc;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;

/**
 * Source of truth for all Certificate of Claim arithmetic.
 * All money is BigDecimal, scale 2, HALF_UP. Never double.
 */
@Service
public class ClaimCalculator {

    public static final int SCALE = 2;
    public static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    /** Input row: type decides whether amount is derived or entered. */
    public record Row(boolean lumpSum, BigDecimal qty, BigDecimal rate, BigDecimal amount) {}

    public record Totals(BigDecimal subTotal, BigDecimal levy, BigDecimal total, BigDecimal grandTotal) {}

    public static BigDecimal money(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(SCALE, ROUNDING);
    }

    /** Measured: qty x rate. Lump sum: the entered amount. */
    public BigDecimal rowAmount(Row row) {
        if (row.lumpSum()) {
            return money(row.amount());
        }
        BigDecimal qty = row.qty() == null ? BigDecimal.ZERO : row.qty();
        BigDecimal rate = row.rate() == null ? BigDecimal.ZERO : row.rate();
        return money(qty.multiply(rate));
    }

    public BigDecimal subTotal(List<Row> rows) {
        BigDecimal sum = BigDecimal.ZERO;
        for (Row r : rows) {
            sum = sum.add(rowAmount(r));
        }
        return money(sum);
    }

    public BigDecimal levy(BigDecimal subTotal, BigDecimal levyPercent) {
        BigDecimal pct = levyPercent == null ? BigDecimal.ZERO : levyPercent;
        return money(money(subTotal).multiply(pct).divide(HUNDRED, 10, ROUNDING));
    }

    public Totals totals(List<Row> rows, BigDecimal levyPercent, BigDecimal balanceBroughtForward) {
        BigDecimal sub = subTotal(rows);
        BigDecimal levy = levy(sub, levyPercent);
        BigDecimal total = money(sub.add(levy));
        BigDecimal grand = money(total.add(money(balanceBroughtForward)));
        return new Totals(sub, levy, total, grand);
    }

    /** Outstanding balance = grandTotal - amountPaid (carried to the next claim as Balance B/F). */
    public BigDecimal outstanding(BigDecimal grandTotal, BigDecimal amountPaid) {
        return money(money(grandTotal).subtract(money(amountPaid)));
    }
}
