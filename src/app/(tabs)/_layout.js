import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

const icon = (name, nameFocused) => ({ color, size, focused }) => (
    <Ionicons name={focused ? nameFocused : name} color={color} size={size} />
);

export default function TabsLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.sub,
                tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
                tabBarStyle: {
                    height: 64 + insets.bottom,
                    paddingBottom: insets.bottom + 6,
                    paddingTop: 6,
                    backgroundColor: colors.card,
                    borderTopWidth: 0,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    // سایه ملایم تا نوار از صفحه جدا شود
                    elevation: 12,
                    shadowColor: '#1b1050',
                    shadowOpacity: 0.12,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: -4 },
                },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'امروز', tabBarIcon: icon('today-outline', 'today') }} />
            <Tabs.Screen name="source" options={{ title: 'منابع', tabBarIcon: icon('library-outline', 'library') }} />
            <Tabs.Screen name="review" options={{ title: 'مرور', tabBarIcon: icon('repeat-outline', 'repeat') }} />
        </Tabs>
    );
}