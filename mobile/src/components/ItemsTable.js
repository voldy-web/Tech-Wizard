import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Icon, IconButton } from './ui';
import { colors } from '../theme';
import { tableColumns } from '../hooks/useLayout';
import { formatAmount, formatMoney, hasMismatch, rowAmount, toPesewas } from '../lib/calc';

const numeric = (t) => t.replace(/[^0-9.,]/g, '');

const BORDER = colors.outline;
   // Description takes the rest, so no sideways scrolling
const cell = { borderRightWidth: 1, borderRightColor: BORDER, justifyContent: 'center' };
const input = { minWidth: 0, paddingHorizontal: 5, paddingVertical: 12, fontSize: 14, color: colors.text };

function HeadCell({ children, w, align = 'center', flex, small }) {
  return (
    <View style={[{ backgroundColor: colors.navy, paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#fff', justifyContent: 'center' },
      flex ? { flex } : { width: w }]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: small ? 10.5 : 11.5, textAlign: align }}>{children}</Text>
    </View>
  );
}

/**
 * The schedule of works as a table, laid out like the paper certificate:
 *   Item | Description | Qty | Unit Price | Amount      (+ a line under each row for Unit, type and Remarks)
 * Measured rows: Amount = Qty x Unit Price (calculated, read-only).
 * Lump-sum rows: Qty and Unit Price are free text (e.g. "1 Item", "Lump sum") and the Amount is typed.
 */
export default function ItemsTable({ items, currency, readOnly, onChange, onDuplicate, onDelete, onToggleType, onPickUnit, onAdd }) {
  // Only the row being edited shows its extra controls (type, remarks, copy, delete) - keeps the table clean.
  const [openKey, setOpenKey] = useState(null);
  const [w, setW] = useState(0);                 // measured table width, so the columns fit any screen
  const COL = tableColumns(w);
  const small = w > 0 && w < 330;
  const open = (key) => () => setOpenKey(key);

  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: colors.primary, paddingVertical: 9 }}>
        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 12.5, letterSpacing: 0.4 }}>ITEMISED SCHEDULE OF WORKS</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <HeadCell w={COL.item} small={small}>{small ? '#' : 'Item'}</HeadCell>
        <HeadCell flex={1} align="left" small={small}>{small ? 'Details' : 'Description'}</HeadCell>
        <HeadCell w={COL.qty}>Qty</HeadCell>
        <HeadCell w={COL.price}>{`Unit Price\n(${currency})`}</HeadCell>
        <HeadCell w={COL.amount}>{`Amount\n(${currency})`}</HeadCell>
      </View>

      {items.length === 0 ? (
        <View style={{ padding: 22, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>No items yet. Tap “Add row” below to start.</Text>
        </View>
      ) : null}

      {items.map((it, i) => {
        const lump = it.type === 'LUMP_SUM';
        const bad = hasMismatch(it);
        const isOpen = openKey === it.key && !readOnly;
        const bg = bad ? colors.errorSoft : i % 2 ? '#F6F5FD' : '#fff';
        return (
          <View key={it.key} style={{ backgroundColor: bg, borderTopWidth: 1, borderTopColor: BORDER }}>
            <View style={{ flexDirection: 'row', minHeight: 64 }}>
              {/* tap the number to show / hide this row's extra controls */}
              <Pressable onPress={() => setOpenKey(isOpen ? null : it.key)} style={[cell, { width: COL.item, alignItems: 'center' }]}
                accessibilityLabel={`Row ${i + 1} options`}>
                <Text style={{ fontWeight: '700', color: isOpen ? colors.primary : colors.text }}>{i + 1}</Text>
              </Pressable>
              <View style={[cell, { flex: 1 }]}>
                <TextInput value={it.description} onChangeText={(t) => onChange(it.key, { description: t })} editable={!readOnly}
                  onFocus={open(it.key)} placeholder="Description" placeholderTextColor="#9AA0B4" multiline style={input} />
              </View>
              <View style={[cell, { width: COL.qty, alignItems: 'center' }]}>
                {lump ? (
                  <TextInput value={it.qtyText ?? '1 Item'} onChangeText={(t) => onChange(it.key, { qtyText: t })} editable={!readOnly} onFocus={open(it.key)}
                    placeholder="1 Item" placeholderTextColor="#9AA0B4" multiline style={[input, { textAlign: 'center', width: '100%' }]} />
                ) : (
                  <>
                    <TextInput value={it.qty} onChangeText={(t) => onChange(it.key, { qty: numeric(t) })} editable={!readOnly} onFocus={open(it.key)}
                      keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9AA0B4" style={[input, { textAlign: 'center', paddingBottom: 0, width: '100%' }]} />
                    <Pressable disabled={readOnly} onPress={() => onPickUnit(it.key)} hitSlop={8} accessibilityLabel="Choose unit"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: it.unit ? colors.mintSoft : colors.containerHigh,
                        paddingLeft: 8, paddingRight: 4, paddingVertical: 4, borderRadius: 12, marginBottom: 6, maxWidth: COL.qty - 4 }}>
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>{it.unit || 'Unit'}</Text>
                      <Icon name="chevron-down" size={14} color={colors.primary} />
                    </Pressable>
                  </>
                )}
              </View>
              <View style={[cell, { width: COL.price }]}>
                {lump ? (
                  <TextInput value={it.priceText ?? ''} onChangeText={(t) => onChange(it.key, { priceText: t })} editable={!readOnly} onFocus={open(it.key)}
                    placeholder="Lump sum" placeholderTextColor="#9AA0B4" multiline style={[input, { textAlign: 'right' }]} />
                ) : (
                  <TextInput value={it.rate} onChangeText={(t) => onChange(it.key, { rate: numeric(t) })} editable={!readOnly} onFocus={open(it.key)}
                    keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4" style={[input, { textAlign: 'right' }]} />
                )}
              </View>
              <View style={{ width: COL.amount, justifyContent: 'center', backgroundColor: 'rgba(91,60,196,0.08)' }}>
                {lump ? (
                  <TextInput value={it.amount} onChangeText={(t) => onChange(it.key, { amount: numeric(t) })} editable={!readOnly} onFocus={open(it.key)}
                    keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4" style={[input, { textAlign: 'right', fontWeight: '700' }]} />
                ) : (
                  <Text style={{ textAlign: 'right', paddingRight: 8, fontWeight: '700', color: bad ? colors.error : colors.text, fontSize: 13 }}>
                    {bad ? '⚠ ' : ''}{formatAmount(rowAmount(it))}
                  </Text>
                )}
              </View>
            </View>

            {/* closed: show remarks (if any) as a quiet line */}
            {!isOpen && it.remarks ? (
              <Text style={{ color: colors.textMuted, fontSize: 12, paddingHorizontal: 10, paddingBottom: 6 }} numberOfLines={1}>↳ {it.remarks}</Text>
            ) : null}

            {/* open: type · remarks · copy · delete */}
            {isOpen ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 2, paddingBottom: 8 }}>
                <Pressable onPress={() => onToggleType(it.key)} accessibilityLabel="Toggle measured or lump sum"
                  style={{ backgroundColor: lump ? colors.accentSoft : colors.mintSoft, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: lump ? colors.brown : colors.primary }}>{lump ? 'LUMP SUM' : 'MEASURED'}</Text>
                </Pressable>
                <TextInput value={it.remarks} onChangeText={(t) => onChange(it.key, { remarks: t })} onFocus={open(it.key)}
                  placeholder="Remarks" placeholderTextColor="#9AA0B4" style={{ flex: 1, minWidth: 0, fontSize: 13, color: colors.textMuted, paddingVertical: 4 }} />
                <IconButton icon="content-copy" size={16} bg="transparent" color={colors.textMuted} onPress={() => onDuplicate(it.key)} />
                <IconButton icon="trash-can-outline" size={16} bg="transparent" color={colors.textMuted} onPress={() => onDelete(it.key)} />
              </View>
            ) : null}
          </View>
        );
      })}

      {readOnly ? null : (
        <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#F8F7FE' }}>
          <Pressable onPress={() => onAdd('MEASURED')} style={btn}><Icon name="plus" size={18} /><Text style={btnText}>Add row</Text></Pressable>
          <Pressable onPress={() => onAdd('LUMP_SUM')} style={btn}><Icon name="plus" size={18} /><Text style={btnText}>Add lump sum</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const btn = { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.containerHigh, paddingVertical: 10, borderRadius: 8 };
const btnText = { fontWeight: '700', color: colors.primary };

/** Defined at module level on purpose: a Row declared inside TotalsTable would be a new component on every
 *  render, which remounts the TextInputs inside it and drops focus after each keystroke. */
function Row({ bg, fg, label, children, bold = true }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.outline }}>
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 8 }}>{typeof label === 'string'
        ? <Text style={{ color: fg, fontWeight: bold ? '700' : '400' }}>{label}</Text> : label}</View>
      <View style={{ paddingHorizontal: 14, alignItems: 'flex-end', flexShrink: 0 }}>{children}</View>
    </View>
  );
}

/** Sub-Total / Markup / Total / B/F / Grand Total, styled like the paper certificate. Markup % and B/F are editable. */
export function TotalsTable({ totals, currency, levyPercent, onLevy, balanceBroughtForward, onBalance, readOnly, weekNumber }) {
  const val = (fg, text, testID) => <Text testID={testID} style={{ color: fg, fontWeight: '800' }}>{text}</Text>;
  return (
    <View style={{ borderWidth: 1, borderColor: colors.outline, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' }}>
      <Row bg={colors.containerHigh} fg={colors.navy} label="Sub-Total">{val(colors.navy, formatAmount(totals.subTotal), 'sub-total')}</Row>
      <Row bg="#fff" fg={colors.text} label={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>Add</Text>
          <TextInput value={levyPercent} onChangeText={(t) => onLevy(numeric(t))} editable={!readOnly} keyboardType="decimal-pad"
            style={{ width: 52, minWidth: 0, textAlign: 'center', backgroundColor: colors.container, borderRadius: 6, paddingVertical: 4, fontWeight: '700', color: colors.text }} />
          <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>% (Markup)</Text>
        </View>
      )}>{val('#C0392B', formatAmount(totals.levy), 'levy')}</Row>
      <Row bg={colors.navy} fg="#fff" label="TOTAL">{val('#fff', formatAmount(totals.total), 'total')}</Row>
      <Row bg={colors.containerHigh} fg={colors.navy} label={(
        <Text style={{ fontWeight: '700', color: colors.navy }}>Balance Brought Forward (B/F)</Text>
      )}>
        <TextInput value={balanceBroughtForward} onChangeText={(t) => onBalance(numeric(t))} editable={!readOnly} keyboardType="decimal-pad"
          style={{ minWidth: 100, textAlign: 'right', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontWeight: '800', color: colors.navy }} />
      </Row>
      <Row bg={colors.primary} fg="#fff" label="GRAND TOTAL">{val('#fff', formatMoney(totals.grandTotal, currency), 'table-grand-total')}</Row>
      <Row bg={colors.accentSoft} fg={colors.brown} label="ROUNDED TOTAL">{val(colors.brown, formatMoney(totals.roundedTotal, currency), 'rounded-total')}</Row>
    </View>
  );
}
