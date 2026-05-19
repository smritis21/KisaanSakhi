import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { AppColors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{emoji}</Text>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const tabBarHeight = isWeb ? 70 : 56 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppColors.primaryMid,
        tabBarInactiveTintColor: '#555555',
        tabBarStyle: {
          backgroundColor: AppColors.white,
          borderTopColor: AppColors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: isWeb ? 8 : (insets.bottom || 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="retailers"
        options={{
          title: 'Priority',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="VisitHistoryScreen"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabIcon emoji="🕐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          tabBarIcon: ({ color }) => <TabIcon emoji="🗺️" color={color} />,
        }}
      />
    </Tabs>
  );
}