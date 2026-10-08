import React from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow, space, statusStyle } from '../theme';
import { setMockMode } from '../api/client';

export function Icon({ name, size = 20, color = colors.primary, style }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}

/** Scrollable page with pull-to-refresh, loading, error and (optional) empty handling. */
export function Screen({ children, loading, error, onRetry, refreshing, onRefresh, contentStyle, bottomPad = 24 }) {
  if (loading) return <View style={styles.page}><LoadingState /></View>;
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[{ padding: space.lg, paddingBottom: bottomPad + 24, gap: space.lg }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
    >
      {error ? <ErrorState error={error} onRetry={onRetry} /> : children}
    </ScrollView>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.muted, { marginTop: space.md }]}>{label}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  const network = error?.isNetwork;
  return (
    <View style={[styles.card, { alignItems: 'center', padding: space.xl, gap: space.md }]}>
      <Icon name={network ? 'wifi-off' : 'alert-circle-outline'} size={44} color={colors.error} />
      <Text style={styles.h3}>{network ? 'Can’t reach the server' : 'Something went wrong'}</Text>
      <Text style={[styles.muted, { textAlign: 'center', lineHeight: 20 }]}>{error?.message || 'Unknown error'}</Text>
      {onRetry ? <Button title="Try again" icon="refresh" onPress={onRetry} /> : null}
      {network ? (
        <Button title="Use demo data instead" icon="flask-outline" variant="soft"
          onPress={() => { setMockMode(true); if (onRetry) onRetry(); }} />
      ) : null}
    </View>
  );
}

export function EmptyState({ icon = 'folder-open-outline', title, message, actionTitle, onAction }) {
  return (
    <View style={[styles.card, { alignItems: 'center', padding: space.xl, gap: space.sm }]}>
      <View style={styles.emptyIcon}><Icon name={icon} size={36} /></View>
      <Text style={styles.h3}>{title}</Text>
      {message ? <Text style={[styles.muted, { textAlign: 'center', lineHeight: 20 }]}>{message}</Text> : null}
      {actionTitle ? <Button title={actionTitle} onPress={onAction} style={{ marginTop: space.sm }} /> : null}
    </View>
  );
}

export function Card({ children, style, onPress, tint }) {
  const body = [styles.card, tint && { backgroundColor: tint }, style];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [...body, pressed && { opacity: 0.85 }]}>{children}</Pressable>;
  return <View style={body}>{children}</View>;
}

export function Button({ title, onPress, icon, variant = 'primary', disabled, loading, style, compact }) {
  const v = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    soft: { bg: colors.containerHigh, fg: colors.primary },
    danger: { bg: colors.errorSoft, fg: colors.error },
    ghost: { bg: 'transparent', fg: colors.primary },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn, compact && { paddingVertical: 8, paddingHorizontal: 12 },
        { backgroundColor: v.bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>
          {icon ? <Icon name={icon} size={compact ? 16 : 20} color={v.fg} /> : null}
          <Text style={[styles.btnText, { color: v.fg }, compact && { fontSize: 13 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = colors.primary, bg = colors.container, size = 20, style }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.iconBtn, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }, style]}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function StatusBadge({ status, partial }) {
  const s = statusStyle[partial ? 'PARTIAL' : status] || statusStyle.DRAFT;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, editable = true, style, inputStyle, suffix, right, autoCapitalize }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Label>{label}</Label> : null}
      <View style={[styles.inputWrap, !editable && { opacity: 0.6 }]}>
        <TextInput
          value={value ?? ''}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA0B4"
          multiline={multiline}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize={autoCapitalize}
          style={[styles.input, multiline && { minHeight: 76, textAlignVertical: 'top' }, inputStyle]}
        />
        {suffix ? <Text style={styles.muted}>{suffix}</Text> : null}
        {right}
      </View>
    </View>
  );
}

export function SectionHeader({ icon, title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        {icon ? <Icon name={icon} size={22} /> : null}
        <Text style={styles.h2}>{title}</Text>
      </View>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.link}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary, style }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <View style={[{ height: 8, borderRadius: 4, backgroundColor: colors.containerHigh, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, ...shadow },
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  h2: { fontSize: 19, fontWeight: '700', color: colors.text },
  h3: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  link: { fontSize: 14, fontWeight: '700', color: colors.primary },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: colors.textMuted, textTransform: 'uppercase' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md },
  btnText: { fontSize: 16, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.container, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.container, alignItems: 'center', justifyContent: 'center' },
});
