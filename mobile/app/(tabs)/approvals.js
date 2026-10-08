import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import ClaimRow from '../../src/components/ClaimRow';
import { Card, EmptyState, Icon, Screen, SectionHeader } from '../../src/components/ui';
import { colors } from '../../src/theme';
import { formatMoney, toPesewas } from '../../src/lib/calc';

/** Work queue: claims awaiting client approval and approved claims awaiting payment. */
export default function Approvals() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [claims, settings] = await Promise.all([api.claims(['SUBMITTED', 'APPROVED']), api.settings()]);
    return { claims, currency: settings.currency };
  });
  const cur = data?.currency;
  const awaitingApproval = (data?.claims || []).filter((c) => c.status === 'SUBMITTED');
  const awaitingPayment = (data?.claims || []).filter((c) => c.status === 'APPROVED');
  const owed = awaitingPayment.reduce((s, c) => s + toPesewas(c.outstanding), 0);

  return (
    <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
      {data && data.claims.length === 0 ? (
        <EmptyState icon="clipboard-check-outline" title="All caught up"
          message="Submitted claims waiting for client approval, and approved claims waiting for payment, will appear here." />
      ) : (
        <>
          <Card tint={colors.accentSoft} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="clock-outline" size={28} color={colors.brown} />
            <Text style={{ flex: 1, color: colors.brown, fontWeight: '700' }}>
              {formatMoney(owed, cur)} approved and awaiting payment
            </Text>
          </Card>
          <SectionHeader icon="send-check-outline" title={`Awaiting approval (${awaitingApproval.length})`} />
          {awaitingApproval.length === 0 ? <Text style={{ color: colors.textMuted }}>Nothing awaiting approval.</Text>
            : awaitingApproval.map((c) => <ClaimRow key={c.id} claim={c} currency={cur} onPress={() => router.push(`/claim/${c.id}/approval`)} />)}
          <SectionHeader icon="cash-clock" title={`Awaiting payment (${awaitingPayment.length})`} />
          {awaitingPayment.length === 0 ? <Text style={{ color: colors.textMuted }}>Nothing awaiting payment.</Text>
            : awaitingPayment.map((c) => <ClaimRow key={c.id} claim={c} currency={cur} showOutstanding onPress={() => router.push(`/claim/${c.id}/approval`)} />)}
        </>
      )}
    </Screen>
  );
}
