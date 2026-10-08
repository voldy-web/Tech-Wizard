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
  const paid = claim ? toPesewas(claim.amountPaid) : 0;
  const outstanding = grand - paid;
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
      .then(() => setPay((p) => ({ ...p, reference: '', note: '' })));
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
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6 }}>CLAIM #{claim.reference}</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{claim.projectName}</Text>
                <Text style={{ color: colors.textMuted }}>Week {claim.weekNumber} · {fmtPeriod(claim.periodFrom, claim.periodTo)}</Text>
              </View>
              <StatusBadge status={claim.status} partial={isPartiallyPaid(claim)} />
            </View>

            {/* Certified total */}
            <Card style={{ gap: 10 }}>
              <Label>Certified total claimed</Label>
              <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>{formatMoney(grand, cur)}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted }}>Settled: {(settled * 100).toFixed(1)}%</Text>
                <Text style={{ color: colors.textMuted }}>Prepared: {fmtDate(claim.datePrepared)}</Text>
              </View>
              <ProgressBar value={settled} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: colors.container, borderRadius: 12, padding: 12 }}>
                  <Label>Liquidated</Label>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary }}>{formatMoney(paid, cur)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12 }}>
                  <Label style={{ color: colors.brown }}>Balance due</Label>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.brown }}>{formatMoney(outstanding, cur)}</Text>
                </View>
              </View>
            </Card>

            {/* Status */}
            <Card style={{ gap: 12 }}>
              <Label>Claim status</Label>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {STATUSES.map((s) => {
                  const active = claim.status === s;
                  return (
                    <Pressable key={s} disabled={busy === 'status'} onPress={() => changeStatus(s)} style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md,
                      backgroundColor: active ? colors.primary : colors.container, opacity: busy === 'status' ? 0.6 : 1,
                    }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3, color: active ? '#fff' : colors.textMuted }}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                DRAFT and SUBMITTED claims can be edited. APPROVED and PAID claims are locked. A claim becomes PAID automatically once fully settled.
              </Text>
            </Card>

            {/* Approval sign-off */}
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="stamper" size={24} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Approval sign-off</Text>
                  <Text style={{ color: colors.textMuted }}>Client certification record</Text>
                </View>
                {claim.approvedBy ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.mintSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Icon name="shield-check-outline" size={14} /><Text style={{ fontWeight: '800', fontSize: 11, color: colors.primary }}>SIGNED</Text></View> : null}
              </View>
              <Field label="Authorised approver" value={approver} onChangeText={setApprover} placeholder="e.g. Kofi Osei" />
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
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.container, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="cash-multiple" size={24} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Payment audit log</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>{claim.payments.length} TRANCHE{claim.payments.length === 1 ? '' : 'S'}</Text>
              </View>

              {claim.payments.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>No payments logged yet.</Text>
              ) : claim.payments.map((p, i) => (
                <View key={p.id} style={{ backgroundColor: colors.container, borderRadius: 12, padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>TRANCHE {i + 1} RECEIVED</Text>
                    <Text style={{ color: colors.textMuted }}>{fmtDate(p.paymentDate)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{formatMoney(toPesewas(p.amount), cur)}</Text>
                    <IconButton icon="trash-can-outline" bg="transparent" color={colors.textMuted} onPress={() => removePayment(p)} />
                  </View>
                  {p.reference ? <Text style={{ color: colors.textMuted }}>Ref: <Text style={{ fontWeight: '700', color: colors.text }}>{p.reference}</Text></Text> : null}
                  {p.note ? <Text style={{ fontStyle: 'italic', color: colors.textMuted }}>“{p.note}”</Text> : null}
                </View>
              ))}

              {canPay ? (
                <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.containerHigh, paddingTop: 12 }}>
                  <Label>Log additional payment</Label>
                  <Field label={`Amount (${cur})`} value={pay.amount} onChangeText={(t) => setPay((p) => ({ ...p, amount: numeric(t) }))} keyboardType="decimal-pad" />
                  <DateField label="Payment date" value={pay.date} onChange={(d) => setPay((p) => ({ ...p, date: d }))} />
                  <Field label="Reference" value={pay.reference} onChangeText={(t) => setPay((p) => ({ ...p, reference: t }))} placeholder="e.g. TXN-GH-992140" />
                  <Field label="Note" value={pay.note} onChangeText={(t) => setPay((p) => ({ ...p, note: t }))} placeholder="Optional" />
                  <Button title="Log payment" icon="plus-circle-outline" variant="soft" loading={busy === 'pay'} onPress={logPayment} />
                </View>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Approve the claim to start logging payments.</Text>
              )}
            </Card>

            {/* Carry-forward */}
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calculator-variant-outline" size={24} color={colors.brown} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Carry-forward calculator</Text>
                  <Text style={{ color: colors.textMuted }}>Reconciliation & B/F derivation</Text>
                </View>
              </View>
              <CalcRow label={`Certified total claim (Week ${claim.weekNumber})`} value={formatMoney(grand, cur)} />
              <CalcRow label="Less total payment received" value={`- ${formatMoney(paid, cur)}`} color={colors.primary} />
              <View style={{ backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12 }}>
                <Label style={{ color: colors.brown }}>Unpaid outstanding balance</Label>
                <Text style={{ fontSize: 26, fontWeight: '800', color: colors.brown, textAlign: 'right' }}>{formatMoney(outstanding, cur)}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>To be claimed in the next billing cycle</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: colors.containerHigh, borderRadius: 12, padding: 12 }}>
                  <Label>Week {claim.weekNumber} remainder</Label>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{formatMoney(Math.max(outstanding, 0), cur)}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{outstanding > 0 ? 'Pending clearance' : 'Fully settled'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.mintSoft, borderRadius: 12, padding: 12 }}>
                  <Label style={{ color: colors.primary }}>Week {claim.weekNumber + 1} opening B/F</Label>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>{formatMoney(Math.max(outstanding, 0), cur)}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Claim base starting value</Text>
                </View>
              </View>
              {isLatest ? (
                <Button title={`Create Week ${claim.weekNumber + 1} claim`} icon="arrow-right-bold-circle-outline" variant="soft" loading={busy === 'next'} onPress={nextWeek} />
              ) : null}
            </Card>

            <Button title="View certificate" icon="file-document-outline" onPress={() => router.push(`/claim/${id}/preview`)} />
            <Button title="Open in editor" icon="pencil-outline" variant="soft" onPress={() => router.push(`/claim/${id}`)} />
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
