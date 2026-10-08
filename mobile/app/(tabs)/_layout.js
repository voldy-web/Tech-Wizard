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
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: '#FBFAFF', borderTopColor: colors.containerHigh, height: 62, paddingBottom: 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={tab('Dashboard', 'view-dashboard-outline', 'view-dashboard', 'Tech Wizard')} />
      <Tabs.Screen name="projects" options={tab('Projects', 'office-building-outline', 'office-building')} />
      <Tabs.Screen name="claims" options={tab('Claims', 'file-document-outline', 'file-document')} />
      <Tabs.Screen name="approvals" options={tab('Approvals', 'clipboard-check-outline', 'clipboard-check')} />
      <Tabs.Screen name="settings" options={tab('Settings', 'cog-outline', 'cog')} />
    </Tabs>
  );
}
