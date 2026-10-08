import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from './ui';
import { colors, radius } from '../theme';

/** Bottom sheet to choose which project a new claim belongs to. */
export default function ProjectPicker({ visible, projects, onPick, onClose, title = 'Create claim for…' }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, maxHeight: '70%' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 }}>{title}</Text>
        <ScrollView>
          {(projects || []).map((p) => (
            <Pressable key={p.id} onPress={() => onPick(p)} style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md,
              backgroundColor: pressed ? colors.containerHigh : colors.container, marginBottom: 8,
            })}>
              <Icon name="office-building-outline" size={22} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>{p.name}</Text>
                {p.client ? <Text style={{ color: colors.textMuted }}>{p.client}</Text> : null}
              </View>
              <Icon name="chevron-right" color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
