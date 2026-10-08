package com.techwizard.calc;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.techwizard.calc.ClaimCalculator.Row;
import com.techwizard.calc.ClaimCalculator.Totals;

class ClaimCalculatorTest {

    private final ClaimCalculator calc = new ClaimCalculator();

    private static BigDecimal bd(String s) { return new BigDecimal(s); }
    private static Row lump(String amount) { return new Row(true, null, null, bd(amount)); }
    private static Row measured(String qty, String rate) { return new Row(false, bd(qty), bd(rate), null); }

    /** Shared reference case - identical to mobile/__tests__/calc.test.js */
    @Test
    void referenceCase() {
        List<Row> rows = List.of(
            lump("16050"),            // General Labour
            measured("450", "120.00"),  // Cement 450 Bags
            measured("1", "3000"),      // Sand
            measured("1", "5600"),      // Dust
            measured("4", "4000"),      // Stone
            lump("7000"),             // Electricals
            lump("1500"),             // Plumbing
            lump("8000"));            // Steel Labour

        Totals t = calc.totals(rows, bd("7"), bd("7734"));

        assertEquals(bd("111150.00"), t.subTotal());
        assertEquals(bd("7780.50"), t.levy());
        assertEquals(bd("118930.50"), t.total());
        assertEquals(bd("126664.50"), t.grandTotal());
    }

    @Test
    void measuredRowIsQtyTimesRateIgnoringAmount() {
        assertEquals(bd("54000.00"), calc.rowAmount(new Row(false, bd("450"), bd("120"), bd("1"))));
    }

    @Test
    void lumpSumUsesEnteredAmount() {
        assertEquals(bd("16050.00"), calc.rowAmount(lump("16050")));
    }

    @Test
    void roundsHalfUp() {
        assertEquals(bd("0.01"), calc.rowAmount(measured("0.5", "0.01")));   // 0.005 -> 0.01
        assertEquals(bd("0.34"), calc.levy(bd("4.85"), bd("7")));            // 0.3395 -> 0.34
    }

    @Test
    void nullsTreatedAsZero() {
        Totals t = calc.totals(List.of(new Row(false, null, null, null)), null, null);
        assertEquals(bd("0.00"), t.grandTotal());
    }

    @Test
    void outstandingIsGrandTotalMinusPaid() {
        assertEquals(bd("12450.00"), calc.outstanding(bd("28750"), bd("16300")));
    }
}
