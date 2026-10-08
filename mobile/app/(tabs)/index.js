import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import { useNewClaim } from '../../src/hooks/useNewClaim';
import ClaimRow from '../../src/components/ClaimRow';
import ProjectPicker from '../../src/components/ProjectPicker';
import { Button, Card, EmptyState, Icon, ProgressBar, Screen, SectionHeader } from '../../src/components/ui';
import { colors } from '../../src/theme';
import { toPesewas, formatAmount } from '../../src/lib/calc';
import { money } from '../../src/lib/format';
import { isMockMode } from '../../src/api/client';

function StatCard({ label, icon, value, sub, tone = 'default', currency }) {
  const tones = {
    default: { bg: colors.surface, fg: colors.text, ic: colors.container, icc: colors.textMuted },
    good: { bg: colors.surface, fg: colors.primary, ic: colors.mintSoft, icc: colors.primary },
    warn: { bg: colors.accentSoft, fg: colors.brown, ic: '#FFD0B0', icc: colors.brown },
  }[tone];
  const [whole, cents] = formatAmount(toPesewas(value)).split('.');
  return (
    <Card tint={tones.bg} style={{ width: '48%', flexGrow: 1, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textMuted }}>{label}</Text>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: tones.ic, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={tones.icc} />
        </View>
      </View>
      <Text style={{ fontSize: 12, color: tones.fg, opacity: 0.8 }}>{currency}</Text>
      <Text style={{ fontSize: 26, fontWeight: '800', color: tones.fg }} adjustsFontSizeToFit numberOfLines={1}>
        {whole}<Text style={{ fontSize: 14, fontWeight: '600' }}>.{cents}</Text>
      </Text>
      <Text style={{ fontSize: 12, color: tones.fg, opacity: 0.85 }}>{sub}</Text>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload } = useApi(
    async () => {
      const [dashboard, settings] = await Promise.all([api.dashboard(), api.settings()]);
      return { dashboard, settings };
    },
  );
  const d = data?.dashboard;
  const s = data?.settings;
  const currency = s?.currency || 'GH₵';
  const newClaim = useNewClaim(d?.projects);

  const pct = useCallback((a, b) => (toPesewas(b) > 0 ? (toPesewas(a) / toPesewas(b)) * 100 : 0), []);

  return (
    <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
      {d ? (
        <>
          {isMockMode() ? (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="flask-outline" size={18} color={colors.brown} />
              <Text style={{ flex: 1, color: colors.brown, fontWeight: '600', fontSize: 12 }}>
                Demo mode: using built-in sample data (no backend). Changes reset when the app reloads.
              </Text>
            </View>
          ) : null}
          {/* Hero */}
          <Card tint={colors.container} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="map-marker" size={16} />
              <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: colors.primary, flexShrink: 1 }} numberOfLines={1}>
                {(s?.address || 'Set your company address in Settings').toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>{s?.preparerName || 'Welcome'}</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>{s?.companyName || 'Add your company details in Settings'}</Text>
            {s?.tin ? <Text style={{ fontSize: 13, color: colors.textMuted }}>TIN / Reg No: {s.tin}</Text> : null}
          </Card>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="New Claim" icon="plus-circle-outline" onPress={newClaim.start} loading={newClaim.busy} style={{ flex: 1 }} />
            <Button title="New Project" icon="office-building-plus-outline" variant="soft" onPress={() => router.push('/project/edit')} style={{ flex: 1 }} />
          </View>

          {/* Summary */}
          <SectionHeader icon="wallet-outline" title="Valuation Summary" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <StatCard label="TOTAL CLAIMED" icon="receipt-text-outline" value={d.claimed} currency={currency}
              sub={`${d.submittedCount} certificate${d.submittedCount === 1 ? '' : 's'} submitted`} />
            <StatCard label="TOTAL APPROVED" icon="check-all" tone="good" value={d.approved} currency={currency}
              sub={`${pct(d.approved, d.claimed).toFixed(1)}% of total claims`} />
            <StatCard label="TOTAL PAID" icon="cash-multiple" value={d.paid} currency={currency}
              sub={`${pct(d.paid, d.claimed).toFixed(1)}% of total claims`} />
            <StatCard label="OUTSTANDING" icon="clock-outline" tone="warn" value={d.outstanding} currency={currency}
              sub="Awaiting payment" />
          </View>

          {/* Projects */}
          <SectionHeader icon="office-building-outline" title="Active Projects" action="See all" onAction={() => router.push('/projects')} />
          {d.projects.length === 0 ? (
            <EmptyState icon="compass-outline" title="No projects yet"
              message="Your ledger is clean. Add your first project to start tracking valuations."
              actionTitle="Add a project" onAction={() => router.push('/project/edit')} />
          ) : d.projects.slice(0, 4).map((p) => (
            <Card key={p.id} onPress={() => router.push(`/project/${p.id}`)} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>{p.name}</Text>
                <View style={{ backgroundColor: colors.container, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>{p.claimCount} CLAIMS</Text>
                </View>
              </View>
              {p.client ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="account-outline" size={16} color={colors.textMuted} /><Text style={{ color: colors.textMuted }}>Client: {p.client}</Text></View> : null}
              <ProgressBar value={toPesewas(p.totalClaimed) > 0 ? toPesewas(p.totalPaid) / toPesewas(p.totalClaimed) : 0} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted }}>Outstanding balance</Text>
                <Text style={{ fontWeight: '800', color: colors.brown }}>{money(p.outstanding, currency)}</Text>
              </View>
            </Card>
          ))}

          {/* Recent claims */}
          <SectionHeader icon="file-document-multiple-outline" title="Recent Claims" action="View all" onAction={() => router.push('/claims')} />
          {d.recentClaims.length === 0 ? (
            <EmptyState icon="file-document-plus-outline" title="No claims yet"
              message="Create a claim for one of your projects to see it here." />
          ) : d.recentClaims.map((c) => (
            <ClaimRow key={c.id} claim={c} currency={currency} onPress={() => router.push(`/claim/${c.id}`)} />
          ))}
        </>
      ) : null}
      <ProjectPicker visible={newClaim.pickerOpen} projects={d?.projects} onClose={newClaim.closePicker} onPick={(p) => newClaim.createFor(p.id)} />
    </Screen>
  );
}
