import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button } from './ui';

/** Bottom sheet to pick a unit from Settings, or type a custom one. */
export default function UnitPicker({ visible, units, current, onPick, onClose }) {
  const [custom, setCustom] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, maxHeight: '65%', gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Choose unit</Text>
        <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(units || []).map((u) => (
            <Pressable key={u} onPress={() => onPick(u)} style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill,
              backgroundColor: u === current ? colors.primary : colors.container,
            }}>
              <Text style={{ fontWeight: '700', color: u === current ? '#fff' : colors.text }}>{u}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={custom} onChangeText={setCustom} placeholder="Custom unit…" placeholderTextColor="#9AA0B4"
            style={{ flex: 1, backgroundColor: colors.container, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16, color: colors.text }} />
          <Button title="Use" compact disabled={!custom.trim()} onPress={() => { onPick(custom.trim()); setCustom(''); }} />
        </View>
      </View>
    </Modal>
  );
}
