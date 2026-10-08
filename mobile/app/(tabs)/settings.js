import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import { Button, Card, Field, Icon, IconButton, Label, Screen, SectionHeader } from '../../src/components/ui';
import { pickImageAsDataUri } from '../../src/lib/pickImage';
import { colors, radius } from '../../src/theme';
import { money } from '../../src/lib/format';

const numeric = (t) => t.replace(/[^0-9.,]/g, '');

function ImageBox({ title, uri, onPick, onClear, icon }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.container, borderRadius: 12, padding: 10, gap: 8, alignItems: 'center' }}>
      <Label>{title}</Label>
      <View style={{ width: '100%', height: 84, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <Icon name={icon} size={32} color={colors.outline} />}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, width: '100%' }}>
        <Button title={uri ? 'Change' : 'Upload'} icon="image-outline" variant="soft" compact style={{ flex: 1 }} onPress={onPick} />
        {uri ? <IconButton icon="close" bg={colors.errorSoft} color={colors.error} onPress={onClear} /> : null}
      </View>
    </View>
  );
}

export default function Settings() {
  const { data, error, loading, refreshing, refresh, reload } = useApi(() => api.settings());
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newUnit, setNewUnit] = useState('');

  useEffect(() => {
    if (data) setF({
      ...data,
      defaultLevyPercent: String(data.defaultLevyPercent ?? 7),
      units: data.units || [],
      commonItems: (data.commonItems || []).map((c) => ({ ...c, defaultRate: c.defaultRate != null ? String(c.defaultRate) : '' })),
    });
  }, [data]);

  const set = (k) => (v) => { setSaved(false); setF((s) => ({ ...s, [k]: v })); };
  const setItem = (i, patch) => { setSaved(false); setF((s) => ({ ...s, commonItems: s.commonItems.map((c, j) => (j === i ? { ...c, ...patch } : c)) })); };

  const pick = (key, opts) => async () => {
    try { const uri = await pickImageAsDataUri(opts); if (uri) set(key)(uri); }
    catch (e) { Alert.alert('Could not load image', e.message); }
  };

  const addUnit = () => {
    const u = newUnit.trim();
    if (!u || f.units.includes(u)) { setNewUnit(''); return; }
    set('units')([...f.units, u]); setNewUnit('');
  };

  const save = async () => {
    const levy = Number(String(f.defaultLevyPercent).replace(/,/g, ''));
    if (Number.isNaN(levy) || levy < 0 || levy > 100) { Alert.alert('Check the levy', 'Default levy must be between 0 and 100.'); return; }
    setSaving(true);
    try {
      const body = {
        ...f,
        defaultLevyPercent: levy,
        commonItems: f.commonItems.filter((c) => c.description.trim()).map((c) => ({
          description: c.description.trim(), unit: c.unit, note: c.note,
          defaultRate: c.defaultRate === '' ? null : Number(String(c.defaultRate).replace(/,/g, '')),
        })),
      };
      await api.saveSettings(body);
      setSaved(true);
      reload();
    } catch (e) { Alert.alert('Could not save settings', e.message); } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
        {f ? (
          <>
            <Card style={{ gap: 14 }}>
              <SectionHeader icon="office-building-outline" title="Company profile & branding" />
              <Field label="Registered entity name" value={f.companyName} onChangeText={set('companyName')} placeholder="Your company name" />
              <Field label="TIN / business reg no" value={f.tin} onChangeText={set('tin')} />
              <Field label="Principal office location" value={f.address} onChangeText={set('address')} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" style={{ flex: 1 }} />
                <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" style={{ flex: 1 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ImageBox title="COMPANY LOGO" uri={f.logoUrl} icon="image-outline" onPick={pick('logoUrl', { maxWidth: 400 })} onClear={() => set('logoUrl')(null)} />
                <ImageBox title="SIGNATURE" uri={f.signatureUrl} icon="draw" onPick={pick('signatureUrl', { maxWidth: 500, png: true })} onClear={() => set('signatureUrl')(null)} />
              </View>
              <Field label="Prepared by (default name)" value={f.preparerName} onChangeText={set('preparerName')} placeholder="Kwame Addae" />
              <Field label="Title" value={f.preparerTitle} onChangeText={set('preparerTitle')} placeholder="Lead Quantity Surveyor" />
              <Field label="Payment / bank details (printed on certificate)" value={f.bankDetails} onChangeText={set('bankDetails')} multiline />
            </Card>

            <Card style={{ gap: 14 }}>
              <SectionHeader icon="cash-multiple" title="Financial & claim defaults" />
              <Field label="Contract currency" value={`${f.currency} (Ghana Cedis)`} editable={false} right={<Icon name="lock-outline" size={18} color={colors.textMuted} />} />
              <Field label="Default levy / retention" value={f.defaultLevyPercent} onChangeText={set('defaultLevyPercent')} keyboardType="decimal-pad" suffix="%" />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Applied to new projects and claims; each can override it.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.container, borderRadius: 12, padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>Auto-calculate Balance Brought Forward</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>New claims start with the previous claim’s unpaid balance. You can still edit it.</Text>
                </View>
                <Switch value={!!f.autoBalanceForward} onValueChange={set('autoBalanceForward')} trackColor={{ true: colors.primary, false: colors.outline }} />
              </View>
            </Card>

            <Card style={{ gap: 12 }}>
              <SectionHeader icon="ruler-square" title="Units" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {f.units.map((u) => (
                  <Pressable key={u} onPress={() => set('units')(f.units.filter((x) => x !== u))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.container, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill }}>
                    <Text style={{ fontWeight: '600', color: colors.text }}>{u}</Text>
                    <Icon name="close" size={14} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput value={newUnit} onChangeText={setNewUnit} placeholder="Add a unit (e.g. Trips)" placeholderTextColor="#9AA0B4" onSubmitEditing={addUnit}
                  style={{ flex: 1, backgroundColor: colors.container, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text }} />
                <Button title="Add" compact variant="soft" onPress={addUnit} />
              </View>
            </Card>

            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionHeader icon="book-open-variant" title="Unit rates catalog" />
                <View style={{ backgroundColor: colors.mintSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>{f.commonItems.length} ITEMS</Text>
                </View>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>These appear as quick-insert buttons in the claim editor.</Text>
              {f.commonItems.length === 0 ? <Text style={{ color: colors.textMuted }}>No standard items yet.</Text> : null}
              {f.commonItems.map((c, i) => (
                <View key={i} style={{ backgroundColor: colors.container, borderRadius: 12, padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput value={c.description} onChangeText={(t) => setItem(i, { description: t })} placeholder="Description" placeholderTextColor="#9AA0B4"
                      style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, paddingVertical: 4 }} />
                    <IconButton icon="trash-can-outline" bg="transparent" color={colors.textMuted}
                      onPress={() => { setSaved(false); setF((s) => ({ ...s, commonItems: s.commonItems.filter((_, j) => j !== i) })); }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Label>Default rate ({f.currency})</Label>
                      <TextInput value={c.defaultRate} onChangeText={(t) => setItem(i, { defaultRate: numeric(t) })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9AA0B4"
                        style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>Per (unit)</Label>
                      <TextInput value={c.unit} onChangeText={(t) => setItem(i, { unit: t })} placeholder="Bags" placeholderTextColor="#9AA0B4"
                        style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 }} />
                    </View>
                  </View>
                  {c.defaultRate !== '' ? <Text style={{ color: colors.primary, fontWeight: '700' }}>{money(c.defaultRate, f.currency)} per {c.unit || 'unit'}</Text> : null}
                </View>
              ))}
              <Button title="Add custom standard item" icon="plus-circle-outline" variant="soft"
                onPress={() => { setSaved(false); setF((s) => ({ ...s, commonItems: [...s.commonItems, { description: '', unit: '', defaultRate: '', note: '' }] })); }} />
            </Card>

            <Button title="Save settings" icon="content-save-outline" loading={saving} onPress={save} />
            {saved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.mintSoft, borderRadius: 12, padding: 12 }}>
                <Icon name="check-circle" size={20} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Company profile and unit rates updated successfully.</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
