import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';
import { Icon } from './ui';
import { useKeyboard } from '../hooks/useKeyboard';

/** Bottom sheet: tap a unit chip to choose it (one tap, sheet closes), or type a custom unit. */
export default function UnitPicker({ visible, units, current, onPick, onClose }) {
  const [custom, setCustom] = useState('');
  const kb = useKeyboard();
  const typing = kb.height > 0;
  const use = (u) => { const v = u.trim(); if (!v) return; setCustom(''); onPick(v); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {typing ? null : <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,18,54,0.55)' }} onPress={onClose} />}
      <View style={[
        { width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 14 },
        typing
          ? { marginTop: 48, marginHorizontal: 12, borderRadius: 32, maxHeight: '55%' }          // keyboard open: float near the top
          : { borderTopLeftRadius: 34, borderTopRightRadius: 34, maxHeight: '70%' },
      ]}>
        <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.outline }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Choose a unit</Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.container, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 }}>
          {(units || []).map((u) => {
            const on = u === current;
            return (
              <Pressable key={u} onPress={() => use(u)} style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.pill,
                backgroundColor: on ? colors.primary : pressed ? colors.containerHigh : colors.container,
              })}>
                {on ? <Icon name="check" size={16} color="#fff" /> : null}
                <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#fff' : colors.text }}>{u}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.container, borderRadius: radius.pill, paddingLeft: 18, paddingRight: 6 }}>
          <TextInput value={custom} onChangeText={setCustom} placeholder="Or type your own unit…" placeholderTextColor="#9AA0B4"
            onSubmitEditing={() => use(custom)} returnKeyType="done"
            style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: colors.text }} />
          <Pressable disabled={!custom.trim()} onPress={() => use(custom)} style={{
            backgroundColor: custom.trim() ? colors.primary : colors.outline, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Use</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
