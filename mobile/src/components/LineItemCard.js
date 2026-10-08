import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Icon, IconButton } from './ui';
import { colors, radius, shadow } from '../theme';
import { formatAmount, formatMoney, hasMismatch, measuredAmount, rowAmount, toPesewas } from '../lib/calc';

const numeric = (t) => t.replace(/[^0-9.,]/g, '');

function Cell({ label, children, flex = 1 }) {
  return (
    <View style={{ flex, gap: 4 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: colors.textMuted }}>{label}</Text>
      {children}
    </View>
  );
}

const inputBox = { minWidth: 0, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, fontSize: 17, fontWeight: '600', color: colors.text };

/** One editable line item: description, qty/unit/rate (measured) or amount (lump sum), remarks, live amount. */
function LineItemCard({ item, index, drag, isActive, currency, readOnly, onChange, onDuplicate, onDelete, onToggleType, onPickUnit }) {
  const lump = item.type === 'LUMP_SUM';
  const mismatch = hasMismatch(item);
  const calc = rowAmount(item);
  const showEntered = !lump && item.enteredAmount !== null && item.enteredAmount !== undefined;
  const set = (k) => (v) => onChange({ [k]: v });

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 10, marginBottom: 12, ...shadow,
      borderWidth: mismatch ? 1.5 : 0, borderColor: colors.error,
      opacity: isActive ? 0.92 : 1, transform: [{ scale: isActive ? 1.02 : 1 }],
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPressIn={readOnly ? undefined : drag} hitSlop={10} disabled={readOnly} accessibilityLabel="Drag to reorder">
          <Icon name="drag" size={24} color={colors.textMuted} />
        </Pressable>
        <View style={{ backgroundColor: colors.container, width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontWeight: '800', color: colors.text, fontSize: 12 }}>{index + 1}</Text>
        </View>
        <Pressable onPress={readOnly ? undefined : onToggleType} style={{
          backgroundColor: mismatch ? colors.errorSoft : lump ? colors.accentSoft : colors.mintSoft,
          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: mismatch ? colors.error : lump ? colors.brown : colors.primary }}>
            {mismatch ? 'AUDIT ALERT' : lump ? 'LUMP SUM' : 'MEASURED'}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {!readOnly ? (
          <>
            <IconButton icon="content-copy" bg="transparent" color={colors.textMuted} size={19} onPress={onDuplicate} />
            <IconButton icon="trash-can-outline" bg="transparent" color={colors.textMuted} size={19} onPress={onDelete} />
          </>
        ) : null}
      </View>

      <TextInput
        value={item.description} onChangeText={set('description')} editable={!readOnly}
        placeholder="Item description" placeholderTextColor="#9AA0B4" multiline
        style={{ fontSize: 17, fontWeight: '600', color: colors.text, paddingVertical: 4 }}
      />

      <View style={{ backgroundColor: colors.container, borderRadius: 12, padding: 10 }}>
        {lump ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.textMuted }}>Lump sum</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Qty 1 · Item</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontWeight: '700' }}>{currency}</Text>
            <TextInput
              value={item.amount} onChangeText={(t) => onChange({ amount: numeric(t) })} editable={!readOnly}
              keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4"
              style={[inputBox, { width: 140, textAlign: 'right' }]}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Cell label="QTY" flex={1}>
              <TextInput value={item.qty} onChangeText={(t) => onChange({ qty: numeric(t) })} editable={!readOnly}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#9AA0B4" style={[inputBox, { textAlign: 'center' }]} />
            </Cell>
            <Cell label="UNIT" flex={1}>
              <Pressable onPress={readOnly ? undefined : onPickUnit} style={[inputBox, { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }]}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: item.unit ? colors.text : '#9AA0B4' }} numberOfLines={1}>{item.unit || 'Unit'}</Text>
              </Pressable>
            </Cell>
            <Cell label={`RATE (${currency})`} flex={1.2}>
              <TextInput value={item.rate} onChangeText={(t) => onChange({ rate: numeric(t) })} editable={!readOnly}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4" style={[inputBox, { textAlign: 'center' }]} />
            </Cell>
          </View>
        )}
      </View>

      {showEntered ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>Claimed amount (as typed)</Text>
          <View style={{ flex: 1 }} />
          <TextInput value={item.enteredAmount} onChangeText={(t) => onChange({ enteredAmount: numeric(t) })} editable={!readOnly}
            keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4"
            style={[inputBox, { width: 130, textAlign: 'right', backgroundColor: colors.container, paddingVertical: 6 }]} />
          <IconButton icon="close" size={16} bg="transparent" color={colors.textMuted} onPress={() => onChange({ enteredAmount: null })} />
        </View>
      ) : null}

      {mismatch ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.errorSoft, borderRadius: 10, padding: 10 }}>
          <Icon name="alert-outline" size={20} color={colors.error} />
          <Text style={{ flex: 1, color: colors.error, fontWeight: '600', fontSize: 13 }}>
            Mismatch: {item.qty || 0} × {formatAmount(toPesewas(item.rate))} = {formatMoney(measuredAmount(item), currency)}, but {formatMoney(toPesewas(item.enteredAmount), currency)} was entered. The calculated figure is used.
          </Text>
          {!readOnly ? (
            <Pressable onPress={() => onChange({ enteredAmount: null })} style={{ backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: colors.error, fontWeight: '800', fontSize: 11 }}>AUTO-RECALC</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="text" size={16} color={colors.textMuted} />
        <TextInput value={item.remarks} onChangeText={set('remarks')} editable={!readOnly} placeholder="Remarks"
          placeholderTextColor="#9AA0B4" style={{ flex: 1, minWidth: 0, fontSize: 14, color: colors.textMuted, paddingVertical: 4 }} />
        {!lump && !showEntered && !readOnly ? (
          <Pressable onPress={() => onChange({ enteredAmount: '' })} hitSlop={8}>
            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>Enter amount</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: colors.textMuted }}>
          {lump ? 'LINE AMOUNT' : 'LINE AMOUNT (QTY × RATE)'}
        </Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: mismatch ? colors.error : colors.primary }}>{formatMoney(calc, currency)}</Text>
      </View>
    </View>
  );
}

export default React.memo(LineItemCard, (a, b) =>
  a.item === b.item && a.index === b.index && a.isActive === b.isActive && a.currency === b.currency && a.readOnly === b.readOnly);
