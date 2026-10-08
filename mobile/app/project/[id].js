import React from 'react';
import { Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import { Button, Card, EmptyState, Icon, IconButton, Label, ProgressBar, Screen, SectionHeader, StatusBadge } from '../../src/components/ui';
import { colors } from '../../src/theme';
import { toPesewas } from '../../src/lib/calc';
import { fmtPeriod, isPartiallyPaid, money } from '../../src/lib/format';

function Stat({ label, value, sub, dot }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.container, borderRadius: 12, padding: 12, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: colors.textMuted }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{sub}</Text>
    </View>
  );
}

function Particular({ label, value, icon }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <View style={{ backgroundColor: colors.container, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ flex: 1, fontSize: 16, color: colors.text, lineHeight: 22 }}>{value || '—'}</Text>
        {icon ? <Icon name={icon} size={20} color={colors.textMuted} /> : null}
      </View>
    </View>
  );
}

export default function ProjectDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [project, claims, settings] = await Promise.all([api.project(id), api.projectClaims(id), api.settings()]);
    return { project, claims, currency: settings.currency };
  }, [id]);
  const [busy, setBusy] = React.useState(false);

  const p = data?.project;
  const claims = data?.claims || [];
  const currency = data?.currency;
  const nextWeek = claims.length ? Math.max(...claims.map((c) => c.weekNumber)) + 1 : 1;
  const latest = claims[0];

  const run = async (fn) => {
    setBusy(true);
    try { const c = await fn(); router.push(`/claim/${c.id}`); }
    catch (e) { Alert.alert('Could not create claim', e.message); }
    finally { setBusy(false); }
  };

  const confirmDelete = () => Alert.alert('Delete project?', 'This also deletes all of its claims. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api.deleteProject(id); router.back(); } catch (e) { Alert.alert('Could not delete', e.message); }
    } },
  ]);

  const claimed = p ? toPesewas(p.totalClaimed) : 0;
  const paid = p ? toPesewas(p.totalPaid) : 0;
  const contract = p?.contractSum ? toPesewas(p.contractSum) : 0;
  const disbursed = contract > 0 ? paid / contract : claimed > 0 ? paid / claimed : 0;

  return (
    <>
      <Stack.Screen options={{
        title: 'Project',
        headerRight: () => p ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton icon="pencil-outline" onPress={() => router.push({ pathname: '/project/edit', params: { id } })} />
            <IconButton icon="trash-can-outline" color={colors.error} bg={colors.errorSoft} onPress={confirmDelete} />
          </View>
        ) : null,
      }} />
      <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
        {p ? (
          <>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>{p.name}</Text>

            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Label>Financial overview</Label>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{(disbursed * 100).toFixed(1)}% disbursed</Text>
              </View>
              <ProgressBar value={disbursed} />
              {contract > 0 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.container, borderRadius: 12, padding: 14 }}>
                  <Text style={{ color: colors.textMuted }}>Contract sum</Text>
                  <Text style={{ fontWeight: '800', color: colors.text }}>{money(p.contractSum, currency)}</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Stat label="CLAIMED" dot={colors.accent} value={money(p.totalClaimed, currency)} sub={`${p.claimCount} certified week${p.claimCount === 1 ? '' : 's'}`} />
                <Stat label="PAID TO DATE" dot={colors.primary} value={money(p.totalPaid, currency)} sub={`${money(p.outstanding, currency)} pending`} />
              </View>
            </Card>

            <Button title={`Create Week ${nextWeek} Claim`} icon="plus-circle-outline" loading={busy} onPress={() => run(() => api.createClaim(id))} />
            {latest ? (
              <Button title={`Duplicate Week ${latest.weekNumber} as Week ${nextWeek}`} icon="content-copy" variant="soft" disabled={busy}
                onPress={() => run(() => api.duplicateClaim(latest.id))} />
            ) : null}

            <SectionHeader icon="clipboard-text-outline" title="Contract Particulars" action="Edit"
              onAction={() => router.push({ pathname: '/project/edit', params: { id } })} />
            <Card style={{ gap: 16 }}>
              <Particular label="Client name" value={p.client} icon="check-decagram-outline" />
              <Particular label="Scope of work" value={p.scopeOfWork} />
              <Particular label="Site location" value={p.location} icon="map-outline" />
              <Particular label="Default levy / retention %" value={`${Number(p.levyPercent ?? 0).toFixed(2)}%`} />
            </Card>

            <SectionHeader icon="file-document-multiple-outline" title="Project Claims History" />
            {claims.length === 0 ? (
              <EmptyState icon="file-document-plus-outline" title="No claims yet"
                message="Create the first weekly claim for this project." />
            ) : claims.map((c) => (
              <Card key={c.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Week {c.weekNumber} Claim</Text>
                    <Text style={{ color: colors.textMuted }}>{fmtPeriod(c.periodFrom, c.periodTo)}</Text>
                  </View>
                  <StatusBadge status={c.status} partial={isPartiallyPaid(c)} />
                </View>
                <Label>Grand total certified</Label>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{money(c.grandTotal, currency)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <IconButton icon="file-document-outline" onPress={() => router.push(`/claim/${c.id}/preview`)} />
                    <Button title="View" compact variant="soft" onPress={() => router.push(`/claim/${c.id}`)} />
                  </View>
                </View>
              </Card>
            ))}
          </>
        ) : null}
      </Screen>
    </>
  );
}
