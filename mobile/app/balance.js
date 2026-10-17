import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api } from '../src/api/client';
import { useApi } from '../src/hooks/useApi';
import { Card, EmptyState, Icon, Screen, StatusBadge } from '../src/components/ui';
import { colors, radius } from '../src/theme';
import { toPesewas } from '../src/lib/calc';
import { fmtDate, money } from '../src/lib/format';

/** Everything money-related in one place: what is still owed (and where the old money comes from) and what has been paid. */
export default function Balance() {
  const router = useRouter();
  const [tab, setTab] = useState('owed');
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [dash, settings, projects] = await Promise.all([api.dashboard(), api.settings(), api.projects()]);
    const groups = [];
    for (const p of projects) {
      const list = (await api.projectClaims(p.id)).filter((c) => c.status !== 'DRAFT').sort((a, b) => a.weekNumber - b.weekNumber);
      const claims = await Promise.all(list.map((c) => api.claim(c.id)));
      if (claims.length) groups.push({ project: p, claims });
    }
    return { dash, cur: settings.currency, groups };
  });
  const cur = data?.cur;

  // Owed: every claim that still has money outstanding, split into this week's work and old money brought forward.
  const owed = [];
  const payments = [];
  (data?.groups || []).forEach(({ project, claims }) => {
    claims.forEach((c, i) => {
      const prev = claims[i - 1];
      const bf = toPesewas(c.balanceBroughtForward);
      const paid = toPesewas(c.amountPaid);
      const out = toPesewas(c.outstanding);
      if (out > 0) {
        const old = Math.min(out, Math.max(0, bf - paid));      // payments clear the oldest money first
        owed.push({ project, claim: c, old, own: out - old, fromWeek: prev?.weekNumber, out });
      }
      (c.payments || []).forEach((p) => payments.push({ project, claim: c, p, bfCleared: 0 }));
      // how much of this claim's payments went to old money
      const first = (c.payments || []).length ? payments.length - c.payments.length : -1;
      if (first >= 0 && bf > 0 && paid > 0) payments[first].bfCleared = Math.min(paid, bf);
      if (first >= 0) payments[first].fromWeek = prev?.weekNumber;
    });
  });
  payments.sort((a, b) => String(b.p.paymentDate).localeCompare(String(a.p.paymentDate)));

  return (
    <>
      <Stack.Screen options={{ title: 'Payments & balance' }} />
      <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
        {data ? (
          <>
            <View style={{ backgroundColor: colors.navy, borderRadius: 32, padding: 20, gap: 4 }}>
              <Text style={{ color: colors.mint, fontWeight: '700' }}>Still owed</Text>
              <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1}>{money(data.dash.outstanding, cur)}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ color: '#B8BCE0' }}>Received so far</Text>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{money(data.dash.paid, cur)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: colors.containerHigh, borderRadius: radius.pill, padding: 4 }}>
              {[['owed', 'Not paid yet'], ['paid', 'Paid']].map(([k, label]) => (
                <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.pill, backgroundColor: tab === k ? colors.surface : 'transparent' }}>
                  <Text style={{ fontWeight: '800', color: tab === k ? colors.primary : colors.textMuted }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'owed' ? (
              owed.length === 0 ? (
                <EmptyState icon="check-decagram" title="Nothing owed" message="Every claim you have sent is fully paid." />
              ) : owed.map(({ project, claim, old, own, fromWeek, out }) => (
                <Card key={claim.id} onPress={() => router.push(`/claim/${claim.id}/approval`)} style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Week {claim.weekNumber}</Text>
                      <Text style={{ color: colors.textMuted }} numberOfLines={1}>{project.name}</Text>
                    </View>
                    <StatusBadge status={claim.status} />
                  </View>
                  <View style={{ backgroundColor: colors.container, borderRadius: 20, padding: 14, gap: 8 }}>
                    <Row label={`This week's work`} value={money(own / 100, cur)} />
                    {old > 0 ? (
                      <Row label={fromWeek ? `Old balance from Week ${fromWeek}` : 'Old balance brought forward'} value={money(old / 100, cur)} color={colors.brown} />
                    ) : null}
                    <View style={{ height: 1, backgroundColor: colors.outline }} />
                    <Row label="Still owed" value={money(out / 100, cur)} bold color={colors.brown} />
                  </View>
                </Card>
              ))
            ) : payments.length === 0 ? (
              <EmptyState icon="cash-multiple" title="No payments yet" message="Payments you log on an approved claim will be listed here." />
            ) : payments.map(({ project, claim, p, bfCleared, fromWeek }) => (
              <Card key={`${claim.id}-${p.id}`} onPress={() => router.push(`/claim/${claim.id}/approval`)} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="cash-check" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: colors.text, fontSize: 17 }}>{money(p.amount, cur)}</Text>
                    <Text style={{ color: colors.textMuted }} numberOfLines={1}>Week {claim.weekNumber} · {project.name}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted }}>{fmtDate(p.paymentDate)}</Text>
                </View>
                {bfCleared > 0 ? (
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    Includes {money(bfCleared / 100, cur)} of old balance{fromWeek ? ` from Week ${fromWeek}` : ''}
                  </Text>
                ) : null}
                {p.reference ? <Text style={{ color: colors.textMuted }}>Ref: {p.reference}</Text> : null}
              </Card>
            ))}
          </>
        ) : null}
      </Screen>
    </>
  );
}

function Row({ label, value, bold, color = colors.text }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: colors.text, flexShrink: 1, fontWeight: bold ? '800' : '400' }}>{label}</Text>
      <Text style={{ fontWeight: '800', color }}>{value}</Text>
    </View>
  );
}
