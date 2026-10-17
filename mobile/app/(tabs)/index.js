import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api/client';
import { useApi } from '../../src/hooks/useApi';
import { useLayout } from '../../src/hooks/useLayout';
import { useNewClaim } from '../../src/hooks/useNewClaim';
import ProjectPicker from '../../src/components/ProjectPicker';
import { Button, Constrain, Icon, Screen } from '../../src/components/ui';
import { colors, shadow } from '../../src/theme';
import { toPesewas, formatAmount } from '../../src/lib/calc';

function Amount({ value, size = 24, color = colors.text }) {
  const [whole, cents] = formatAmount(toPesewas(value)).split('.');
  return (
    <Text style={{ fontSize: size, fontWeight: '800', color }} adjustsFontSizeToFit numberOfLines={1}>
      {whole}<Text style={{ fontSize: size * 0.55, fontWeight: '600' }}>.{cents}</Text>
    </Text>
  );
}

/** One full-width rounded row under the hero. */
function Tile({ label, icon, value, currency, bg, fg, iconBg, onPress }) {
  const { compact } = useLayout();
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 10 : 14, backgroundColor: bg, borderRadius: 28, padding: compact ? 12 : 16, ...shadow }}>
      <View style={{ width: compact ? 40 : 48, height: compact ? 40 : 48, borderRadius: 24, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={fg} />
      </View>
      <Text style={{ fontSize: compact ? 14 : 16, fontWeight: '700', color: fg }} numberOfLines={2}>{label}</Text>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Text style={{ fontSize: 12, color: fg, opacity: 0.7 }}>{currency}</Text>
        <Amount value={value} size={compact ? 18 : 22} color={fg} />
      </View>
      {onPress ? <Icon name="chevron-right" size={22} color={fg} /> : null}
    </Wrap>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  return (
    <Screen loading={loading} error={error} onRetry={reload} refreshing={refreshing} onRefresh={refresh}
      contentStyle={{ padding: 0, gap: 0 }} fullBleed>
      {d ? (
        <>
          {/* Curved hero */}
          <View style={{ backgroundColor: colors.navy, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 64,
            borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
            <Constrain>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image source={require('../../assets/logo.png')} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.mint, fontSize: 13, fontWeight: '700' }}>Welcome back</Text>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }} numberOfLines={1}>{s?.companyName || 'Tech Wizard'}</Text>
              </View>
            </View>
            <Text style={{ color: colors.mint, fontSize: 14, fontWeight: '700', marginTop: 28 }}>Total claimed</Text>
            <Text style={{ color: '#fff', fontSize: 15, opacity: 0.85 }}>{currency}</Text>
            <Amount value={d.claimed} size={40} color="#fff" />
            </Constrain>
          </View>

          <Constrain style={{ paddingHorizontal: 16, marginTop: -40, gap: 20 }}>
            <View style={{ gap: 12 }}>
              <Tile label="Approved" icon="check-all" value={d.approved} currency={currency} bg="#fff" fg={colors.primary} iconBg={colors.mintSoft} />
              <Tile label="Received" icon="cash-multiple" value={d.paid} currency={currency} bg="#fff" fg={colors.text} iconBg={colors.container} onPress={() => router.push('/balance')} />
              <Tile label="Still owed" icon="clock-outline" value={d.outstanding} currency={currency} bg={colors.accentSoft} fg={colors.brown} iconBg="#FFD0B0" onPress={() => router.push('/balance')} />
            </View>

            <View style={{ gap: 12 }}>
              <Button title="New claim" icon="plus-circle-outline" onPress={newClaim.start} loading={newClaim.busy} />
              <Button title="New project" icon="office-building-plus-outline" variant="soft" onPress={() => router.push('/project/edit')} />
            </View>

            {d.projects.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 15, paddingHorizontal: 24 }}>
                Start by adding your first project.
              </Text>
            ) : null}
          </Constrain>
        </>
      ) : null}
      <ProjectPicker visible={newClaim.pickerOpen} projects={d?.projects} onClose={newClaim.closePicker} onPick={(p) => newClaim.createFor(p.id)} />
    </Screen>
  );
}
