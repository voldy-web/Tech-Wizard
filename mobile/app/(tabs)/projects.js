import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import { useNewClaim } from '../../src/hooks/useNewClaim';
import { Button, Card, EmptyState, Icon, ProgressBar, Screen } from '../../src/components/ui';
import { colors } from '../../src/theme';
import { toPesewas } from '../../src/lib/calc';
import { money } from '../../src/lib/format';

export default function Projects() {
  const router = useRouter();
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [projects, settings] = await Promise.all([api.projects(), api.settings()]);
    return { projects, currency: settings.currency };
  });
  const projects = data?.projects || [];
  const currency = data?.currency;
  const newClaim = useNewClaim(projects);

  return (
    <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
      <Button title="New Project" icon="office-building-plus-outline" onPress={() => router.push('/project/edit')} />
      {data && projects.length === 0 ? (
        <EmptyState icon="compass-outline" title="No projects drafted yet"
          message="Add your first project, then create weekly Certificates of Claim for it."
          actionTitle="Create first project" onAction={() => router.push('/project/edit')} />
      ) : projects.map((p) => (
        <Card key={p.id} onPress={() => router.push(`/project/${p.id}`)} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.text }}>{p.name}</Text>
            <View style={{ backgroundColor: colors.container, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>{p.claimCount} CLAIMS</Text>
            </View>
          </View>
          {p.client ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="account-outline" size={16} color={colors.textMuted} /><Text style={{ color: colors.textMuted }}>Client: {p.client}</Text></View> : null}
          {p.location ? <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="map-marker-outline" size={16} color={colors.textMuted} /><Text style={{ color: colors.textMuted, flexShrink: 1 }} numberOfLines={1}>{p.location}</Text></View> : null}
          <ProgressBar value={toPesewas(p.totalClaimed) > 0 ? toPesewas(p.totalPaid) / toPesewas(p.totalClaimed) : 0} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Outstanding balance</Text>
            <Text style={{ fontWeight: '800', color: colors.brown }}>{money(p.outstanding, currency)}</Text>
          </View>
          <Button title="New claim" icon="plus-circle-outline" variant="soft" compact onPress={() => newClaim.createFor(p.id)} />
        </Card>
      ))}
    </Screen>
  );
}
