import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import { useNewClaim } from '../../src/hooks/useNewClaim';
import ClaimRow from '../../src/components/ClaimRow';
import ProjectPicker from '../../src/components/ProjectPicker';
import { Button, EmptyState, Screen } from '../../src/components/ui';
import { colors, radius } from '../../src/theme';

const FILTERS = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'];

export default function Claims() {
  const router = useRouter();
  const [filter, setFilter] = useState('ALL');
  const { data, error, loading, refreshing, refresh, reload } = useApi(async () => {
    const [claims, projects, settings] = await Promise.all([api.claims(), api.projects(), api.settings()]);
    return { claims, projects, currency: settings.currency };
  });
  const newClaim = useNewClaim(data?.projects);
  const list = (data?.claims || []).filter((c) => filter === 'ALL' || c.status === filter);

  return (
    <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}>
      <Button title="New Claim" icon="plus-circle-outline" onPress={newClaim.start} loading={newClaim.busy} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
            backgroundColor: filter === f ? colors.primary : colors.surface,
          }}>
            <Text style={{ fontWeight: '700', fontSize: 12, color: filter === f ? '#fff' : colors.textMuted }}>{f === 'ALL' ? 'ALL' : f}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {data && list.length === 0 ? (
        <EmptyState icon="file-document-plus-outline"
          title={filter === 'ALL' ? 'No claims yet' : `No ${filter.toLowerCase()} claims`}
          message={filter === 'ALL' ? 'Create a claim for one of your projects.' : 'Nothing here right now. Pull down to refresh.'}
          actionTitle={filter === 'ALL' ? 'Create a claim' : undefined} onAction={newClaim.start} />
      ) : list.map((c) => (
        <ClaimRow key={c.id} claim={c} currency={data.currency} onPress={() => router.push(`/claim/${c.id}`)} />
      ))}
      <ProjectPicker visible={newClaim.pickerOpen} projects={data?.projects} onClose={newClaim.closePicker} onPick={(p) => newClaim.createFor(p.id)} />
    </Screen>
  );
}
