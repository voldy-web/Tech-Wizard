import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/hooks/useApi';
import DateField from '../../../src/components/DateField';
import { Button, Card, Field, Icon, IconButton, Label, ProgressBar, Screen, StatusBadge } from '../../../src/components/ui';
import { colors, radius } from '../../../src/theme';
import { formatMoney, toPesewas } from '../../../src/lib/calc';
import { fmtDate, fmtPeriod, isPartiallyPaid, todayIso } from '../../../src/lib/format';

const STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'];
const numeric = (t) => t.replace(/[^0-9.,]/g, '');

export default function ApprovalPayment() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload, setData } = useApi(async () => {
    const claim = await api.claim(id);
    const [settings, siblings] = await Promise.all([api.settings(), api.projectClaims(claim.projectId)]);
    return { claim, currency: settings.currency, siblings };
  }, [id]);

  const claim = data?.claim;
  const cur = data?.currency || 'GH₵';
  const [approver, setApprover] = useState('');
  const [approvedDate, setApprovedDate] = useState(todayIso());
  const [pay, setPay] = useState({ amount: '', date: todayIso(), reference: '', note: '' });
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!claim) return;
    setApprover(claim.approvedBy || '');
    setApprovedDate(claim.approvedDate || todayIso());
    setPay((p) => ({ ...p, amount: toPesewas(claim.outstanding) > 0 ? String(claim.outstanding) : '' }));
  }, [claim?.id, claim?.status, claim?.amountPaid, claim?.approvedBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (updated) => setData((d) => ({ ...d, claim: updated }));
  const guard = (key, fn) => async () => {
    setBusy(key);
    try { apply(await fn()); } catch (e) { Alert.alert('Could not update', e.message); } finally { setBusy(null); }
  };

  const grand = claim ? toPesewas(claim.grandTotal) : 0;
  // money received on this claim PLUS what later claims have already paid of its balance (old money counts as paid)
  const paid = claim ? toPesewas(claim.amountPaid) + toPesewas(claim.settledLater) : 0;
  const outstanding = claim ? toPesewas(claim.outstanding) : 0;
  const settled = grand > 0 ? Math.min(1, paid / grand) : 0;
  const isLatest = !!claim && data.siblings.length > 0 && data.siblings[0].id === claim.id;
  const canPay = claim && (claim.status === 'APPROVED' || claim.status === 'PAID');

  const changeStatus = (status) => {
    if (!claim || status === claim.status) return;
    if ((status === 'APPROVED' || status === 'PAID') && !approver.trim()) {
      Alert.alert('Approver required', 'Enter the name of the person who approved this claim first.');
      return;
    }
    const send = guard('status', () => api.setStatus(id, {
      status, approvedBy: approver.trim() || undefined, approvedDate: approvedDate || undefined,
      paymentDate: pay.date || undefined, paymentReference: pay.reference || undefined, paymentNote: pay.note || undefined,
    }));
    if (status === 'PAID' && outstanding > 0) {
      Alert.alert('Mark as fully paid?', `This logs a payment of ${formatMoney(outstanding, cur)} for the remaining balance.`, [
        { text: 'Cancel', style: 'cancel' }, { text: 'Mark paid', onPress: send },
      ]);
    } else if (claim.status === 'APPROVED' || claim.status === 'PAID') {
      if (status === 'DRAFT' || status === 'SUBMITTED') {
        Alert.alert('Reopen claim?', 'Approval details are cleared (logged payments are kept).', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Reopen', onPress: send },
        ]);
      } else send();
    } else send();
  };

  const logPayment = () => {
    const amt = toPesewas(pay.amount);
    if (amt <= 0) { Alert.alert('Enter an amount', 'Payment amount must be greater than zero.'); return; }
    guard('pay', () => api.addPayment(id, { amount: (amt / 100).toFixed(2), paymentDate: pay.date || undefined, reference: pay.reference, note: pay.note }))()
      .then(() => setPay((p) => ({ ...p, date: todayIso(), reference: '', note: '' })));   // every payment gets its own date
  };

  const removePayment = (p) => Alert.alert('Remove payment?', `${formatMoney(toPesewas(p.amount), cur)} will be removed from the log.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: guard('rm', () => api.removePayment(id, p.id)) },
  ]);

  const nextWeek = async () => {
    setBusy('next');
    try { const c = await api.createClaim(claim.projectId); router.push(`/claim/${c.id}`); }
    catch (e) { Alert.alert('Could not create claim', e.message); } finally { setBusy(null); }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Approval & payment' }} />
      <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
        {claim ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{claim.projectName}</Text>
                <Text style={{ color: colors.textMuted }}>Week {claim.weekNumber} · {fmtPeriod(claim.periodFrom, claim.periodTo)}</Text>
              </View>
              <StatusBadge status={claim.status} partial={isPartiallyPaid(claim)} />
            </View>

            {/* Money summary */}
            <View style={{ backgroundColor: colors.navy, borderRadius: 32, padding: 20, gap: 12 }}>
              <Text style={{ color: colors.mint, fontWeight: '700' }}>Claim total</Text>
              <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff' }} adjustsFontSizeToFit numberOfLines={1}>{formatMoney(grand, cur)}</Text>
              <ProgressBar value={settled} color={colors.mint} style={{ backgroundColor: 'rgba(255,255,255,0.2)', height: 10, borderRadius: 5 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 14 }}>
                <Text style={{ color: colors.mint, fontWeight: '700' }}>Paid so far</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{formatMoney(paid, cur)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.accentSoft, borderRadius: 20, padding: 14 }}>
                <Text style={{ color: colors.brown, fontWeight: '700' }}>Still owed</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.brown }}>{formatMoney(outstanding, cur)}</Text>
              </View>
            </View>

            {/* Status */}
            <Card style={{ gap: 12 }}>
              <Label>Status</Label>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {STATUSES.map((s) => {
                  const active = claim.status === s;
                  return (
                    <Pressable key={s} disabled={busy === 'status'} onPress={() => changeStatus(s)} style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill,
                      backgroundColor: active ? colors.primary : colors.container, opacity: busy === 'status' ? 0.6 : 1,
                    }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3, color: active ? '#fff' : colors.textMuted }}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Approval sign-off */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="stamper" size={24} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Client approval</Text>
                </View>
                {claim.approvedBy ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.mintSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Icon name="shield-check-outline" size={14} /><Text style={{ fontWeight: '800', fontSize: 11, color: colors.primary }}>SIGNED</Text></View> : null}
              </View>
              <Field label="Approved by" value={approver} onChangeText={setApprover} placeholder="e.g. Kofi Osei" />
              <DateField label="Approval date" value={approvedDate} onChange={setApprovedDate} />
              {claim.status === 'SUBMITTED' || claim.status === 'DRAFT' ? (
                <Button title="Record approval" icon="check-decagram-outline" loading={busy === 'status'} onPress={() => changeStatus('APPROVED')} />
              ) : (
                <Button title="Update approver details" icon="content-save-outline" variant="soft" loading={busy === 'status'}
                  onPress={guard('status', () => api.setStatus(id, { status: claim.status, approvedBy: approver.trim(), approvedDate: approvedDate }))} />
              )}
            </Card>

            {/* Payment log */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.container, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="cash-multiple" size={24} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Payments</Text>
                </View>
              </View>

              {claim.payments.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>No payments yet.</Text>
              ) : claim.payments.map((p, i) => (
                <View key={p.id} style={{ backgroundColor: colors.container, borderRadius: 20, padding: 14, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>PAYMENT {i + 1}</Text>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{fmtDate(p.paymentDate)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{formatMoney(toPesewas(p.amount), cur)}</Text>
                    <IconButton icon="trash-can-outline" bg="transparent" color={colors.textMuted} onPress={() => removePayment(p)} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    Total paid after this: {formatMoney(claim.payments.slice(0, i + 1).reduce((a, x) => a + toPesewas(x.amount), 0), cur)}
                  </Text>
                  {p.reference ? <Text style={{ color: colors.textMuted }}>Ref: <Text style={{ fontWeight: '700', color: colors.text }}>{p.reference}</Text></Text> : null}
                  {p.note ? <Text style={{ fontStyle: 'italic', color: colors.textMuted }}>“{p.note}”</Text> : null}
                </View>
              ))}

              {canPay ? (
                <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.containerHigh, paddingTop: 12 }}>
                  <Label>Add a payment</Label>
                  <Field label={`Amount (${cur})`} value={pay.amount} onChangeText={(t) => setPay((p) => ({ ...p, amount: numeric(t) }))} keyboardType="decimal-pad" />
                  <DateField label="Date paid" value={pay.date} onChange={(d) => setPay((p) => ({ ...p, date: d }))} />
                  <Field label="Reference" value={pay.reference} onChangeText={(t) => setPay((p) => ({ ...p, reference: t }))} placeholder="e.g. TXN-GH-992140" />
                  <Field label="Note" value={pay.note} onChangeText={(t) => setPay((p) => ({ ...p, note: t }))} placeholder="Optional" />
                  <Button title="Save payment" icon="plus-circle-outline" variant="soft" loading={busy === 'pay'} onPress={logPayment} />
                </View>
              ) : null}
            </Card>

            {/* Next week's balance */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calendar-arrow-right" size={24} color={colors.brown} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }}>Next week's balance</Text>
              </View>
              <CalcRow label={`Week ${claim.weekNumber} claim`} value={formatMoney(grand, cur)} />
              <CalcRow label="Paid" value={`- ${formatMoney(paid, cur)}`} color={colors.primary} />
              <View style={{ backgroundColor: colors.accentSoft, borderRadius: 22, padding: 14 }}>
                <Text style={{ color: colors.brown, fontWeight: '700' }}>Brought forward to Week {claim.weekNumber + 1}</Text>
                <Text style={{ fontSize: 26, fontWeight: '800', color: colors.brown, textAlign: 'right' }}>{formatMoney(Math.max(outstanding, 0), cur)}</Text>
              </View>
              {isLatest ? (
                <Button title={`Create Week ${claim.weekNumber + 1} claim`} icon="arrow-right-bold-circle-outline" variant="soft" loading={busy === 'next'} onPress={nextWeek} />
              ) : null}
            </Card>

            <Button title="View certificate" icon="file-document-outline" onPress={() => router.push(`/claim/${id}/preview`)} />
            <Button title="Open in editor" icon="pencil-outline" variant="soft" onPress={() => router.push(`/claim/${id}`)} />
            <Button title="Done" icon="check" onPress={() => router.replace('/')} />
          </>
        ) : null}
      </Screen>
    </>
  );
}

function CalcRow({ label, value, color = colors.text }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: colors.text, flexShrink: 1 }}>{label}</Text>
      <Text style={{ fontWeight: '700', color }}>{value}</Text>
    </View>
  );
}
