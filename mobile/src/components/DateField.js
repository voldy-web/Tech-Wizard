import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Icon, Label } from './ui';
import { colors, radius } from '../theme';
import { fmtDate, todayIso } from '../lib/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** The weeks of a month as rows of 7 (null = blank cell). Sunday first. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
}

/**
 * A date field that opens a calendar: pick a day, move between months (and years) with the arrows.
 * Pure JS (works in Expo Go). Value is "YYYY-MM-DD".
 */
export default function DateField({ label, value, onChange, editable = true, style }) {
  const [open, setOpen] = useState(false);
  const base = ISO.test(value || '') ? value : todayIso();
  const [view, setView] = useState({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });

  const show = () => {
    if (!editable) return;
    const b = ISO.test(value || '') ? value : todayIso();
    setView({ y: Number(b.slice(0, 4)), m: Number(b.slice(5, 7)) - 1 });
    setOpen(true);
  };
  const move = (dm) => setView(({ y, m }) => { const t = y * 12 + m + dm; return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; });
  const pick = (d) => { onChange(iso(view.y, view.m, d)); setOpen(false); };
  const today = todayIso();
  const grid = monthGrid(view.y, view.m);

  const Arrow = ({ icon, onPress, label: l }) => (
    <Pressable onPress={onPress} accessibilityLabel={l} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.container, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={22} color={colors.primary} />
    </Pressable>
  );

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Label>{label}</Label> : null}
      <Pressable onPress={show} accessibilityLabel={label ? `${label}: choose date` : 'Choose date'}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.container, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, opacity: editable ? 1 : 0.6 }}>
        <Icon name="calendar-month-outline" size={20} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: 16, color: value ? colors.text : '#9AA0B4' }}>{value ? fmtDate(value) : 'Select a date'}</Text>
        <Icon name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(15,18,54,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: 32, padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Arrow icon="chevron-double-left" label="Previous year" onPress={() => move(-12)} />
              <Arrow icon="chevron-left" label="Previous month" onPress={() => move(-1)} />
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.text }}>{MONTHS[view.m]} {view.y}</Text>
              <Arrow icon="chevron-right" label="Next month" onPress={() => move(1)} />
              <Arrow icon="chevron-double-right" label="Next year" onPress={() => move(12)} />
            </View>
            <View style={{ flexDirection: 'row' }}>
              {DAYS.map((d) => <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.textMuted }}>{d}</Text>)}
            </View>
            {grid.map((week, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                {week.map((d, c) => {
                  if (!d) return <View key={c} style={{ flex: 1 }} />;
                  const v = iso(view.y, view.m, d);
                  const sel = v === value; const isToday = v === today;
                  return (
                    <Pressable key={c} onPress={() => pick(d)} accessibilityLabel={`Pick ${d} ${MONTHS[view.m]} ${view.y}`} style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: sel ? colors.primary : 'transparent', borderWidth: isToday && !sel ? 2 : 0, borderColor: colors.mint }}>
                        <Text style={{ fontSize: 15, fontWeight: sel || isToday ? '800' : '500', color: sel ? '#fff' : colors.text }}>{d}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable onPress={() => setOpen(false)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.container }}>
                <Text style={{ fontWeight: '800', color: colors.textMuted }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { onChange(today); setOpen(false); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.primary }}>
                <Text style={{ fontWeight: '800', color: '#fff' }}>Today</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
