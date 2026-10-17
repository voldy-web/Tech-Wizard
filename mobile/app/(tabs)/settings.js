import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import { Button, Constrain, Field, Icon, Screen } from '../../src/components/ui';
import { colors, radius, shadow } from '../../src/theme';

const AUTOSAVE_MS = 700;

/** A soft rounded section with a coloured icon badge. */
function Section({ icon, tint, title, children }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 30, padding: 18, gap: 14, ...shadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={22} color={colors.navy} />
        </View>
        <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function Settings() {
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => api.settings());
  const insets = useSafeAreaInsets();
  const [f, setF] = useState(null);
  const [state, setState] = useState('saved');      // saved | pending | error
  const [newUnit, setNewUnit] = useState('');
  const latest = useRef(null);
  const dirty = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    if (data && !dirty.current) {
      const next = { ...data, defaultLevyPercent: String(data.defaultLevyPercent ?? 7), units: data.units || [] };
      latest.current = next;
      setF(next);
    }
  }, [data]);

  const flush = async () => {
    if (!dirty.current || !latest.current) return;
    const cur = latest.current;
    const levy = Number(String(cur.defaultLevyPercent).replace(/,/g, ''));
    if (cur.defaultLevyPercent === '' || Number.isNaN(levy) || levy < 0 || levy > 100) { setState('error'); return; }   // wait for a valid markup
    dirty.current = false;
    try {
      await api.saveSettings({ ...cur, defaultLevyPercent: levy });
      setState(dirty.current ? 'pending' : 'saved');
    } catch { dirty.current = true; setState('error'); }
  };

  const change = (patch) => {
    setF((s) => { const n = { ...s, ...patch }; latest.current = n; return n; });
    dirty.current = true;
    setState('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  };
  const set = (k) => (v) => change({ [k]: v });

  // never lose an edit when leaving the tab / closing the app screen
  useEffect(() => () => { clearTimeout(timer.current); flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addUnit = () => {
    const u = newUnit.trim();
    if (!u || f.units.includes(u)) { setNewUnit(''); return; }
    change({ units: [...f.units, u] }); setNewUnit('');
  };

  const status = {
    saved: { icon: 'check-circle', text: 'All changes saved', fg: colors.primary, bg: colors.mintSoft },
    pending: { icon: 'sync', text: 'Saving…', fg: colors.textMuted, bg: colors.container },
    error: { icon: 'alert-circle-outline', text: 'Enter a markup between 0 and 100 to save', fg: colors.error, bg: colors.errorSoft },
  }[state];

  return (
    <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh} contentStyle={{ padding: 0, gap: 0 }} fullBleed>
      {f ? (
        <>
          <View style={{ backgroundColor: colors.navy, paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
            <Constrain style={{ gap: 10 }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>Settings</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: status.bg, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill }}>
              <Icon name={status.icon} size={16} color={status.fg} />
              <Text style={{ color: status.fg, fontWeight: '700', fontSize: 12.5 }}>{status.text}</Text>
            </View>
            </Constrain>
          </View>

          <Constrain style={{ paddingHorizontal: 16, marginTop: -32, gap: 18, paddingBottom: 24 }}>
            <Section icon="office-building-outline" tint={colors.mint} title="Company">
              <Field label="Company name" value={f.companyName} onChangeText={set('companyName')} placeholder="Your company name" />
              <Field label="TIN / registration no." value={f.tin} onChangeText={set('tin')} />
              <Field label="Office address" value={f.address} onChangeText={set('address')} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" style={{ flex: 1 }} />
                <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" style={{ flex: 1 }} />
              </View>
            </Section>

            <Section icon="account-edit-outline" tint="#E4DAFB" title="Prepared by">
              <Field label="Name" value={f.preparerName} onChangeText={set('preparerName')} placeholder="Kwame Addae" />
              <Field label="Title" value={f.preparerTitle} onChangeText={set('preparerTitle')} placeholder="Lead Quantity Surveyor" />
              <Field label="Payment details (printed on certificate)" value={f.bankDetails} onChangeText={set('bankDetails')} multiline />
            </Section>

            <Section icon="percent-outline" tint={colors.accentSoft} title="Claim defaults">
              <Field label="Default markup %" value={f.defaultLevyPercent} onChangeText={set('defaultLevyPercent')} keyboardType="decimal-pad" suffix="%" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.container, borderRadius: 22, padding: 14 }}>
                <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>Carry the unpaid balance into the next claim</Text>
                <Switch value={!!f.autoBalanceForward} onValueChange={set('autoBalanceForward')} trackColor={{ true: colors.primary, false: colors.outline }} thumbColor="#fff" />
              </View>
            </Section>

            <Section icon="ruler-square" tint={colors.mintSoft} title="Units">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {f.units.map((u) => (
                  <Pressable key={u} onPress={() => change({ units: f.units.filter((x) => x !== u) })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.container, paddingLeft: 14, paddingRight: 10, paddingVertical: 9, borderRadius: radius.pill }}>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{u}</Text>
                    <Icon name="close" size={14} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.container, borderRadius: radius.pill, paddingLeft: 18, paddingRight: 6 }}>
                <TextInput value={newUnit} onChangeText={setNewUnit} placeholder="Add a unit (e.g. Trips)" placeholderTextColor="#9AA0B4" onSubmitEditing={addUnit}
                  style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text }} />
                <Button title="Add" compact onPress={addUnit} />
              </View>
            </Section>
          </Constrain>
        </>
      ) : null}
    </Screen>
  );
}
