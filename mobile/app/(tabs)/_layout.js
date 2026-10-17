import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '../../src/components/ui';
import { colors } from '../../src/theme';

const tab = (title, icon, iconActive, headerTitle) => ({
  title,
  headerTitle: headerTitle || title,
  tabBarIcon: ({ color, focused, size }) => <Icon name={focused ? iconActive : icon} size={size + 2} color={color} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 0, height: 68, paddingBottom: 8, paddingTop: 8, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 14, shadowColor: '#1B1F3B', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab('Home', 'home-variant-outline', 'home-variant'), headerShown: false }} />
      <Tabs.Screen name="projects" options={tab('Projects', 'office-building-outline', 'office-building')} />
      <Tabs.Screen name="claims" options={tab('Claims', 'file-document-outline', 'file-document')} />
      <Tabs.Screen name="approvals" options={tab('Approvals', 'clipboard-check-outline', 'clipboard-check')} />
      <Tabs.Screen name="settings" options={{ ...tab('Settings', 'cog-outline', 'cog'), headerShown: false }} />
    </Tabs>
  );
}
