import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Icon, IconButton } from './ui';
import { colors } from '../theme';
import { formatAmount, formatMoney, hasMismatch, rowAmount, toPesewas } from '../lib/calc';

const numeric = (t) => t.replace(/[^0-9.,]/g, '');

const BORDER = '#C3D2E3';
const COL = { item: 30, qty: 52, price: 72, amount: 86 };   // Description takes the rest, so no sideways scrolling
const cell = { borderRightWidth: 1, borderRightColor: BORDER, justifyContent: 'center' };
const input = { minWidth: 0, paddingHorizontal: 5, paddingVertical: 10, fontSize: 14, color: colors.text };

function HeadCell({ children, w, align = 'center', flex }) {
  return (
    <View style={[{ backgroundColor: '#1B3A5C', paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#fff', justifyContent: 'center' },
      flex ? { flex } : { width: w }]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11.5, textAlign: align }}>{children}</Text>
    </View>
  );
}

/**
 * The schedule of works as a table, laid out like the paper certificate:
 *   Item | Description | Qty | Unit Price | Amount      (+ a line under each row for Unit, type and Remarks)
 * Measured rows: Amount = Qty x Unit Price (calculated, read-only).
 * Lump-sum rows: type the Amount directly (shows 1 Item).
 */
export default function ItemsTable({ items, currency, readOnly, onChange, onDuplicate, onDelete, onToggleType, onPickUnit, onAdd }) {
  return (
    <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#2E75B6', paddingVertical: 7 }}>
        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 12.5, letterSpacing: 0.4 }}>ITEMISED SCHEDULE OF WORKS</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <HeadCell w={COL.item}>Item</HeadCell>
        <HeadCell flex={1} align="left">Description</HeadCell>
        <HeadCell w={COL.qty}>Qty</HeadCell>
        <HeadCell w={COL.price}>{`Unit Price\n(${currency})`}</HeadCell>
        <HeadCell w={COL.amount}>{`Amount\n(${currency})`}</HeadCell>
      </View>

      {items.length === 0 ? (
        <View style={{ padding: 22, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>No items yet. Tap “Add row” below, or a quick-insert chip above.</Text>
        </View>
      ) : null}

      {items.map((it, i) => {
        const lump = it.type === 'LUMP_SUM';
        const bad = hasMismatch(it);
        const bg = bad ? colors.errorSoft : i % 2 ? '#F0F4FA' : '#fff';
        return (
          <View key={it.key} style={{ backgroundColor: bg, borderTopWidth: 1, borderTopColor: BORDER }}>
            <View style={{ flexDirection: 'row', minHeight: 46 }}>
              <View style={[cell, { width: COL.item, alignItems: 'center' }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{i + 1}</Text>
              </View>
              <View style={[cell, { flex: 1 }]}>
                <TextInput value={it.description} onChangeText={(t) => onChange(it.key, { description: t })} editable={!readOnly}
                  placeholder="Description" placeholderTextColor="#9AA0B4" multiline style={input} />
              </View>
              <View style={[cell, { width: COL.qty }]}>
                {lump ? <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>1 Item</Text> : (
                  <TextInput value={it.qty} onChangeText={(t) => onChange(it.key, { qty: numeric(t) })} editable={!readOnly}
                    keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9AA0B4" style={[input, { textAlign: 'center' }]} />
                )}
              </View>
              <View style={[cell, { width: COL.price }]}>
                {lump ? <Text style={{ textAlign: 'right', paddingRight: 8, color: colors.textMuted }}>—</Text> : (
                  <TextInput value={it.rate} onChangeText={(t) => onChange(it.key, { rate: numeric(t) })} editable={!readOnly}
                    keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4" style={[input, { textAlign: 'right' }]} />
                )}
              </View>
              <View style={{ width: COL.amount, justifyContent: 'center', backgroundColor: lump ? undefined : 'rgba(46,117,182,0.08)' }}>
                {lump ? (
                  <TextInput value={it.amount} onChangeText={(t) => onChange(it.key, { amount: numeric(t) })} editable={!readOnly}
                    keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4" style={[input, { textAlign: 'right', fontWeight: '700' }]} />
                ) : (
                  <Text style={{ textAlign: 'right', paddingRight: 8, fontWeight: '700', color: bad ? colors.error : colors.text }}>
                    {bad ? '⚠ ' : ''}{formatAmount(rowAmount(it))}
                  </Text>
                )}
              </View>
            </View>

            {/* second line: unit · type · remarks · actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 2, paddingBottom: 6 }}>
              <Pressable disabled={readOnly || lump} onPress={() => onPickUnit(it.key)}
                style={{ backgroundColor: lump ? 'transparent' : colors.container, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, minWidth: 54, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: lump || !it.unit ? colors.textMuted : colors.text }}>
                  {lump ? 'Item' : `${it.unit || 'Unit'} ▾`}
                </Text>
              </Pressable>
              <Pressable disabled={readOnly} onPress={() => onToggleType(it.key)} accessibilityLabel="Toggle measured or lump sum"
                style={{ backgroundColor: lump ? colors.accentSoft : colors.mintSoft, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: lump ? colors.brown : colors.primary }}>{lump ? 'LUMP SUM' : 'MEASURED'}</Text>
              </Pressable>
              <TextInput value={it.remarks} onChangeText={(t) => onChange(it.key, { remarks: t })} editable={!readOnly}
                placeholder="Remarks" placeholderTextColor="#9AA0B4" style={{ flex: 1, minWidth: 0, fontSize: 13, color: colors.textMuted, paddingVertical: 4 }} />
              {readOnly ? null : (
                <>
                  <IconButton icon="content-copy" size={16} bg="transparent" color={colors.textMuted} onPress={() => onDuplicate(it.key)} />
                  <IconButton icon="trash-can-outline" size={16} bg="transparent" color={colors.textMuted} onPress={() => onDelete(it.key)} />
                </>
              )}
            </View>
          </View>
        );
      })}

      {readOnly ? null : (
        <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#F6F9FD' }}>
          <Pressable onPress={() => onAdd('MEASURED')} style={btn}><Icon name="plus" size={18} /><Text style={btnText}>Add row</Text></Pressable>
          <Pressable onPress={() => onAdd('LUMP_SUM')} style={btn}><Icon name="plus" size={18} /><Text style={btnText}>Add lump sum</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const btn = { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.containerHigh, paddingVertical: 10, borderRadius: 8 };
const btnText = { fontWeight: '700', color: colors.primary };

/** Sub-Total / Levy / Total / B/F / Grand Total, styled like the paper certificate. Levy % and B/F are editable. */
export function TotalsTable({ totals, currency, levyPercent, onLevy, balanceBroughtForward, onBalance, readOnly, weekNumber }) {
  const Row = ({ bg, fg, label, children, bold = true }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, minHeight: 44, borderTopWidth: 1, borderTopColor: '#C3D2E3' }}>
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 8 }}>{typeof label === 'string'
        ? <Text style={{ color: fg, fontWeight: bold ? '700' : '400' }}>{label}</Text> : label}</View>
      <View style={{ paddingHorizontal: 12, alignItems: 'flex-end', flexShrink: 0 }}>{children}</View>
    </View>
  );
  const val = (fg, text, testID) => <Text testID={testID} style={{ color: fg, fontWeight: '800' }}>{text}</Text>;
  return (
    <View style={{ borderWidth: 1, borderColor: '#C3D2E3', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}>
      <Row bg="#D6E4F0" fg="#1B3A5C" label="Sub-Total">{val('#1B3A5C', formatAmount(totals.subTotal), 'sub-total')}</Row>
      <Row bg="#fff" fg={colors.text} label={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>Add</Text>
          <TextInput value={levyPercent} onChangeText={(t) => onLevy(numeric(t))} editable={!readOnly} keyboardType="decimal-pad"
            style={{ width: 52, minWidth: 0, textAlign: 'center', backgroundColor: colors.container, borderRadius: 6, paddingVertical: 4, fontWeight: '700', color: colors.text }} />
          <Text style={{ fontWeight: '700', color: colors.text }} numberOfLines={1}>% (Levy)</Text>
        </View>
      )}>{val('#C0392B', formatAmount(totals.levy), 'levy')}</Row>
      <Row bg="#1B3A5C" fg="#fff" label="TOTAL">{val('#fff', formatAmount(totals.total), 'total')}</Row>
      <Row bg="#D6E4F0" fg="#1B3A5C" label={(
        <View style={{ gap: 4 }}>
          <Text style={{ fontWeight: '700', color: '#1B3A5C' }}>Balance Brought Forward (B/F)</Text>
          {weekNumber > 1 ? <Text style={{ fontSize: 11, color: colors.textMuted }}>Pre-filled from the previous claim. Editable.</Text> : null}
        </View>
      )}>
        <TextInput value={balanceBroughtForward} onChangeText={(t) => onBalance(numeric(t))} editable={!readOnly} keyboardType="decimal-pad"
          style={{ minWidth: 100, textAlign: 'right', backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontWeight: '800', color: '#1B3A5C' }} />
      </Row>
      <Row bg="#2E75B6" fg="#fff" label="GRAND TOTAL">{val('#fff', formatMoney(totals.grandTotal, currency), 'table-grand-total')}</Row>
    </View>
  );
}
