import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { api } from '../../../src/api/client';
import { Button, Card, ErrorState, Field, Icon, IconButton, Label, LoadingState, StatusBadge } from '../../../src/components/ui';
import LineItemCard from '../../../src/components/LineItemCard';
import ItemsTable, { TotalsTable } from '../../../src/components/ItemsTable';
import UnitPicker from '../../../src/components/UnitPicker';
import DateField from '../../../src/components/DateField';
import { colors, radius, shadow, space } from '../../../src/theme';
import { computeTotals, formatMoney, hasMismatch, toPesewas } from '../../../src/lib/calc';
import { blankItem, fromServerItem, newKey, switchType, toServerItem } from '../../../src/lib/claimModel';
import { fmtPeriod, isPartiallyPaid } from '../../../src/lib/format';

const AUTOSAVE_MS = 1200;
const numeric = (t) => t.replace(/[^0-9.,]/g, '');

function SaveStatus({ state, savedAt, onRetry }) {
  const cfg = {
    saved: { icon: 'cloud-check-outline', text: savedAt ? `Draft auto-saved ${savedAt}` : 'All changes saved', color: colors.primary },
    pending: { icon: 'cloud-sync-outline', text: 'Unsaved changes…', color: colors.textMuted },
    saving: { icon: 'cloud-upload-outline', text: 'Saving…', color: colors.textMuted },
    error: { icon: 'cloud-alert', text: 'Not saved – tap to retry', color: colors.error },
  }[state];
  return (
    <Pressable onPress={state === 'error' ? onRetry : undefined} style={{
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: state === 'error' ? colors.errorSoft : colors.container,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, alignSelf: 'flex-start',
    }}>
      <Icon name={cfg.icon} size={16} color={cfg.color} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: cfg.color }}>{cfg.text}</Text>
    </Pressable>
  );
}

export default function ClaimEditor() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claim, setClaim] = useState(null);          // read-only server snapshot (status, project, ...)
  const [settings, setSettings] = useState(null);
  const [header, setHeader] = useState(null);        // editable header fields
  const [items, setItems] = useState([]);
  const [saveState, setSaveState] = useState('saved');
  const [savedAt, setSavedAt] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [unitFor, setUnitFor] = useState(null);      // item key whose unit is being chosen
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [view, setView] = useState('table');         // 'table' (spreadsheet-style) | 'cards' (drag to reorder)

  const latest = useRef({ header: null, items: [] });
  const dirty = useRef(false);
  const saving = useRef(false);
  const timer = useRef(null);
  const listRef = useRef(null);
  const [version, setVersion] = useState(0);

  const currency = settings?.currency || 'GH₵';
  const readOnly = claim ? claim.status === 'APPROVED' || claim.status === 'PAID' : true;

  // ---------- load ----------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([api.claim(id), api.settings()]);
      setClaim(c);
      setSettings(s);
      const h = {
        weekNumber: String(c.weekNumber), periodFrom: c.periodFrom || '', periodTo: c.periodTo || '',
        preparedBy: c.preparedBy || '', datePrepared: c.datePrepared || '', levyPercent: String(c.levyPercent ?? 0),
        balanceBroughtForward: String(c.balanceBroughtForward ?? 0), notes: c.notes || '',
      };
      const its = (c.items || []).map(fromServerItem);
      setHeader(h); setItems(its);
      setDetailsOpen(its.length === 0);
      latest.current = { header: h, items: its };
      dirty.current = false;
      setSaveState('saved'); setError(null);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ---------- autosave ----------
  const save = useCallback(async () => {
    if (saving.current || !dirty.current) return;
    const { header: h, items: its } = latest.current;
    if (!h) return;
    saving.current = true;
    dirty.current = false;
    setSaveState('saving');
    try {
      const week = parseInt(h.weekNumber, 10);
      await api.updateClaim(id, {
        weekNumber: Number.isNaN(week) || week < 1 ? undefined : week,
        periodFrom: h.periodFrom || undefined, periodTo: h.periodTo || undefined,
        preparedBy: h.preparedBy, datePrepared: h.datePrepared || undefined,
        levyPercent: Math.min(100, Math.max(0, Number(String(h.levyPercent).replace(/,/g, '')) || 0)),
        balanceBroughtForward: toPesewas(h.balanceBroughtForward) / 100,
        notes: h.notes,
      });
      await api.saveItems(id, its.map(toServerItem));
      setSaveState(dirty.current ? 'pending' : 'saved');
      const d = new Date();
      setSavedAt(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } catch (e) {
      dirty.current = true;
      setSaveState('error');
      saving.current = false;
      if (e.status === 409 && /locked/i.test(e.message)) Alert.alert('Claim is locked', e.message);
      else if (!e.isNetwork) Alert.alert('Could not save', e.message);
      return;
    }
    saving.current = false;
    if (dirty.current) setVersion((v) => v + 1); // edits made while saving
  }, [id]);

  useEffect(() => {
    if (!dirty.current || readOnly) return undefined;
    setSaveState((s) => (s === 'saving' ? s : 'pending'));
    clearTimeout(timer.current);
    timer.current = setTimeout(save, AUTOSAVE_MS);
    return () => clearTimeout(timer.current);
  }, [version, save, readOnly]);

  // flush pending edits when leaving the screen
  useEffect(() => () => { clearTimeout(timer.current); if (dirty.current) save(); }, [save]);

  const touch = () => { dirty.current = true; setVersion((v) => v + 1); };

  const setHeaderField = (k) => (v) => {
    setHeader((h) => { const n = { ...h, [k]: v }; latest.current.header = n; return n; });
    touch();
  };

  const mutateItems = (fn) => {
    setItems((prev) => { const n = fn(prev); latest.current.items = n; return n; });
    touch();
  };
  const updateItem = (key, patch) => mutateItems((l) => l.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const addItem = (item) => {
    mutateItems((l) => [...l, item]);
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 150);
  };
  const duplicateItem = (key) => mutateItems((l) => {
    const i = l.findIndex((x) => x.key === key);
    const copy = { ...l[i], key: newKey() };
    return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)];
  });
  const deleteItem = (key) => {
    const it = items.find((x) => x.key === key);
    const go = () => mutateItems((l) => l.filter((x) => x.key !== key));
    if (!it?.description && !it?.rate && !it?.amount) return go();
    Alert.alert('Delete item?', it.description || 'This item', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: go }]);
  };

  // ---------- live totals (integer pesewas) ----------
  const totals = useMemo(() => computeTotals(items, header?.levyPercent, header?.balanceBroughtForward), [items, header?.levyPercent, header?.balanceBroughtForward]);
  const mismatchCount = useMemo(() => items.filter((i) => hasMismatch(i)).length, [items]);

  // ---------- actions ----------
  const flush = async () => {
    clearTimeout(timer.current);
    dirty.current = true;
    while (saving.current) await new Promise((r) => setTimeout(r, 100));
    await save();
    return saveState !== 'error' && !dirty.current;
  };

  const goPreview = async () => { await flush(); router.push(`/claim/${id}/preview`); };

  const submit = () => Alert.alert('Submit claim?', `Week ${header.weekNumber} will be marked SUBMITTED. You can still edit it until it is approved.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Submit', onPress: async () => {
      setBusy(true);
      try {
        await flush();
        const c = await api.setStatus(id, { status: 'SUBMITTED' });
        setClaim(c);
        router.push(`/claim/${id}/approval`);
      } catch (e) { Alert.alert('Could not submit', e.message); } finally { setBusy(false); }
    } },
  ]);

  const reopen = async () => {
    setBusy(true);
    try { await api.setStatus(id, { status: 'DRAFT' }); await load(); } catch (e) { Alert.alert('Could not reopen', e.message); } finally { setBusy(false); }
  };

  const duplicateClaim = () => Alert.alert('Duplicate this claim?', 'Creates the next week with the same items and the new Balance B/F.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Duplicate', onPress: async () => {
      try { await flush(); const c = await api.duplicateClaim(id); router.replace(`/claim/${c.id}`); } catch (e) { Alert.alert('Could not duplicate', e.message); }
    } },
  ]);

  const deleteClaim = () => Alert.alert('Delete claim?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { dirty.current = false; await api.deleteClaim(id); router.back(); } catch (e) { Alert.alert('Could not delete', e.message); }
    } },
  ]);

  // ---------- render ----------
  const renderItem = useCallback(({ item, getIndex, drag, isActive }) => (
    <LineItemCard
      item={item} index={getIndex() ?? 0} drag={drag} isActive={isActive} currency={currency} readOnly={readOnly}
      onChange={(patch) => updateItem(item.key, patch)}
      onDuplicate={() => duplicateItem(item.key)}
      onDelete={() => deleteItem(item.key)}
      onToggleType={() => mutateItems((l) => l.map((x) => (x.key === item.key ? switchType(x) : x)))}
      onPickUnit={() => setUnitFor(item.key)}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [currency, readOnly, items.length]);

  if (loading) return <LoadingState />;
  if (error) return <ScrollView contentContainerStyle={{ padding: space.lg }}><ErrorState error={error} onRetry={load} /></ScrollView>;

  const header_ = (
    <View style={{ gap: space.lg, paddingBottom: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SaveStatus state={saveState} savedAt={savedAt} onRetry={() => { dirty.current = true; save(); }} />
        <View style={{ backgroundColor: colors.mintSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>INTERIM NO. {String(header.weekNumber || 0).padStart(2, '0')}</Text>
        </View>
      </View>

      {readOnly ? (
        <Card tint={colors.mintSoft} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="lock-outline" size={18} />
            <Text style={{ fontWeight: '700', color: colors.primary }}>This claim is {claim.status} and locked</Text>
            <StatusBadge status={claim.status} partial={isPartiallyPaid(claim)} />
          </View>
          <Button title="Reopen as draft to edit" icon="lock-open-outline" variant="soft" compact loading={busy} onPress={reopen} />
        </Card>
      ) : null}

      <Card style={{ gap: 12 }}>
        <Pressable onPress={() => setDetailsOpen((o) => !o)} accessibilityLabel="Show or hide claim details"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label>Claim details</Label>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }} numberOfLines={1}>{claim.projectName}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
              Week {header.weekNumber || '?'} · {fmtPeriod(header.periodFrom, header.periodTo)} · levy {header.levyPercent || 0}%
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{detailsOpen ? 'Hide' : 'Edit'}</Text>
          <Icon name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={22} />
        </Pressable>
        {detailsOpen ? (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field label="Valuation week" value={header.weekNumber} onChangeText={(t) => setHeaderField('weekNumber')(t.replace(/\D/g, ''))}
                keyboardType="number-pad" editable={!readOnly} style={{ flex: 1 }} />
              <Field label="Levy / retention" value={header.levyPercent} onChangeText={(t) => setHeaderField('levyPercent')(numeric(t))}
                keyboardType="decimal-pad" suffix="%" editable={!readOnly} style={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <DateField label="Period from" value={header.periodFrom} onChange={setHeaderField('periodFrom')} editable={!readOnly} style={{ flex: 1 }} />
              <DateField label="Period to" value={header.periodTo} onChange={setHeaderField('periodTo')} editable={!readOnly} style={{ flex: 1 }} />
            </View>
            <Field label="Prepared by" value={header.preparedBy} onChangeText={setHeaderField('preparedBy')} editable={!readOnly} placeholder="Name of preparer" />
            <DateField label="Date prepared" value={header.datePrepared} onChange={setHeaderField('datePrepared')} editable={!readOnly} />
          </>
        ) : null}
      </Card>

      {!readOnly && (settings?.commonItems?.length || 0) > 0 ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Icon name="flash-outline" size={20} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Quick-insert item</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Tap to append</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {settings.commonItems.map((ci, i) => (
              <Pressable key={`${ci.description}-${i}`} onPress={() => addItem({ ...blankItem('MEASURED', ci.unit || ''), description: ci.description, qty: '1', rate: ci.defaultRate != null ? String(ci.defaultRate) : '' })}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: pressed ? colors.containerHigh : colors.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, ...shadow })}>
                <Icon name="plus-circle-outline" size={18} />
                <Text style={{ fontWeight: '600', color: colors.text }}>{ci.description}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {view === 'cards' ? (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text }}>Itemised Schedule of Works</Text>
          <View style={{ backgroundColor: colors.containerHigh, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>{items.length}</Text>
          </View>
        </View>
      </View>
      ) : null}

      <View style={{ flexDirection: 'row', backgroundColor: colors.containerHigh, borderRadius: radius.md, padding: 3 }}>
        {[['table', 'Table', 'table'], ['cards', 'Cards (drag to reorder)', 'view-agenda-outline']].map(([k, label, icon]) => (
          <Pressable key={k} onPress={() => setView(k)} style={{
            flex: k === 'table' ? 0.7 : 1.3, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: radius.sm,
            backgroundColor: view === k ? colors.surface : 'transparent',
          }}>
            <Icon name={icon} size={16} color={view === k ? colors.primary : colors.textMuted} />
            <Text style={{ fontWeight: '700', fontSize: 12.5, color: view === k ? colors.primary : colors.textMuted }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {!readOnly && view === 'cards' ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Measured item" icon="ruler" variant="soft" compact style={{ flex: 1 }} onPress={() => addItem(blankItem('MEASURED'))} />
          <Button title="Lump sum" icon="cash" variant="soft" compact style={{ flex: 1 }} onPress={() => addItem(blankItem('LUMP_SUM'))} />
        </View>
      ) : null}
      {mismatchCount > 0 ? (
        <Text style={{ color: colors.error, fontWeight: '600' }}>⚠ {mismatchCount} row{mismatchCount > 1 ? 's' : ''} where the entered amount ≠ qty × rate. Calculated amounts are used.</Text>
      ) : null}
    </View>
  );

  const footer_ = (
    <View style={{ gap: space.md, paddingTop: space.sm }}>
      {items.length === 0 ? (
        <Card style={{ alignItems: 'center', gap: 6, padding: space.xl }}>
          <Icon name="playlist-plus" size={36} />
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>No items yet</Text>
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Add a measured item or lump sum above, or tap a quick-insert chip.</Text>
        </Card>
      ) : null}
      <Card style={{ gap: 6 }}>
        <Label>Notes & settlement particulars (shown on certificate)</Label>
        <TextInput value={header.notes} onChangeText={setHeaderField('notes')} editable={!readOnly} multiline
          placeholder="e.g. Payment due within 14 days. Bank details…" placeholderTextColor="#9AA0B4"
          style={{ minHeight: 80, fontSize: 15, color: colors.text, textAlignVertical: 'top', backgroundColor: colors.container, borderRadius: 12, padding: 12 }} />
      </Card>
      <View style={{ height: 24 }} />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{
        title: `Week ${header.weekNumber || ''} claim`,
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton icon="content-copy" onPress={duplicateClaim} />
            <IconButton icon="trash-can-outline" color={colors.error} bg={colors.errorSoft} onPress={deleteClaim} />
          </View>
        ),
      }} />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {view === 'table' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {header_}
            <ItemsTable
              items={items} currency={currency} readOnly={readOnly}
              onChange={updateItem}
              onDuplicate={duplicateItem}
              onDelete={deleteItem}
              onToggleType={(key) => mutateItems((l) => l.map((x) => (x.key === key ? switchType(x) : x)))}
              onPickUnit={(key) => setUnitFor(key)}
              onAdd={(type) => addItem(blankItem(type))}
            />
            <View style={{ height: space.lg }} />
            <TotalsTable totals={totals} currency={currency} readOnly={readOnly} weekNumber={Number(header.weekNumber) || 1}
              levyPercent={header.levyPercent} onLevy={setHeaderField('levyPercent')}
              balanceBroughtForward={header.balanceBroughtForward} onBalance={setHeaderField('balanceBroughtForward')} />
            {footer_}
          </ScrollView>
        ) : (
        <DraggableFlatList
          ref={listRef}
          data={items}
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          onDragEnd={({ data }) => { mutateItems(() => data); }}
          activationDistance={12}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }}
          ListHeaderComponent={header_}
          ListFooterComponent={footer_}
          keyboardShouldPersistTaps="handled"
        />
        )}

        {/* Sticky valuation summary */}
        <View style={{
          backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
          paddingHorizontal: space.lg, paddingTop: 10, paddingBottom: 12, gap: 8,
          shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 12,
        }}>
          {view === 'cards' ? (
            <Pressable onPress={() => setSheetOpen((o) => !o)} hitSlop={8} accessibilityLabel="Toggle breakdown"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{sheetOpen ? 'Hide' : 'View'} breakdown</Text>
              <Icon name={sheetOpen ? 'chevron-down' : 'chevron-up'} size={20} />
            </Pressable>
          ) : null}

          {sheetOpen && view === 'cards' ? (
            <View style={{ gap: 8 }}>
              <Row label={`Sub-total (${items.length} item${items.length === 1 ? '' : 's'})`} value={formatMoney(totals.subTotal, currency)} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 15, color: colors.textMuted }}>Levy / Retention</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.container, borderRadius: 8, paddingHorizontal: 8 }}>
                    <TextInput value={header.levyPercent} onChangeText={(t) => setHeaderField('levyPercent')(numeric(t))} editable={!readOnly}
                      keyboardType="decimal-pad" style={{ minWidth: 40, paddingVertical: 4, fontWeight: '700', color: colors.text, textAlign: 'center' }} />
                    <Text style={{ color: colors.textMuted }}>%</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{formatMoney(totals.levy, currency)}</Text>
              </View>
              <Row label={`Current claim total (Week ${header.weekNumber})`} value={formatMoney(totals.total, currency)} valueColor={colors.primary} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.container, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 15, color: colors.textMuted, flex: 1 }}>Balance brought forward</Text>
                <Text style={{ color: colors.textMuted, marginRight: 4 }}>{currency}</Text>
                <TextInput value={header.balanceBroughtForward} onChangeText={(t) => setHeaderField('balanceBroughtForward')(numeric(t))} editable={!readOnly}
                  keyboardType="decimal-pad" style={{ minWidth: 100, textAlign: 'right', fontSize: 16, fontWeight: '700', color: colors.text, paddingVertical: 2 }} />
              </View>
            </View>
          ) : null}

          <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.mint, fontWeight: '800', fontSize: 11, letterSpacing: 0.5, flexShrink: 1 }}>GRAND TOTAL</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'right', flex: 1 }} testID="grand-total" numberOfLines={1}>
              {formatMoney(totals.grandTotal, currency)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Draft" icon="content-save-outline" variant="soft" compact style={{ flex: 1 }} disabled={readOnly}
              onPress={async () => { await flush(); }} />
            <Button title="Preview" icon="eye-outline" variant="soft" compact style={{ flex: 1 }} onPress={goPreview} />
            {claim.status === 'DRAFT' ? (
              <Button title="Submit" icon="send-outline" compact style={{ flex: 1 }} loading={busy} onPress={submit} />
            ) : (
              <Button title="Approval" icon="clipboard-check-outline" compact style={{ flex: 1 }} onPress={() => router.push(`/claim/${id}/approval`)} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <UnitPicker visible={!!unitFor} units={settings?.units} current={items.find((i) => i.key === unitFor)?.unit}
        onClose={() => setUnitFor(null)} onPick={(u) => { updateItem(unitFor, { unit: u }); setUnitFor(null); }} />
    </>
  );
}

function Row({ label, value, valueColor = colors.text }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 15, color: colors.textMuted, flexShrink: 1 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: valueColor }}>{value}</Text>
    </View>
  );
}
