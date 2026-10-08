import React from 'react';
import { Text, View } from 'react-native';
import { Card, Icon, StatusBadge } from './ui';
import { colors } from '../theme';
import { isPartiallyPaid, money, pad } from '../lib/format';

const ICONS = {
  DRAFT: ['pencil-box-outline', colors.container, colors.textMuted],
  SUBMITTED: ['send-check-outline', '#D8E2FF', '#1C3F94'],
  APPROVED: ['clipboard-check-outline', colors.mintSoft, colors.primary],
  PAID: ['check-decagram', colors.mint, colors.primaryDark],
};

/** One claim in a list (dashboard, Claims tab, Approvals tab). */
export default function ClaimRow({ claim, onPress, currency, showOutstanding }) {
  const [icon, bg, fg] = ICONS[claim.status] || ICONS.DRAFT;
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
      <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
          Claim #{pad(claim.weekNumber, 3)} <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>WEEK {claim.weekNumber}</Text>
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 14, color: colors.textMuted }}>{claim.projectName}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          {money(showOutstanding ? claim.outstanding : claim.grandTotal, currency)}
        </Text>
        <StatusBadge status={claim.status} partial={isPartiallyPaid(claim)} />
      </View>
    </Card>
  );
}
