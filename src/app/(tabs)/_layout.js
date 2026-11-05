import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

const icon = (name) => ({ color, size }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
                tabBarStyle: {
                    height: 64 + insets.bottom,
                    paddingBottom: insets.bottom + 6,
                    paddingTop: 6,
                },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'امروز', tabBarIcon: icon('today-outline') }} />
            <Tabs.Screen name="source" options={{ title: 'منابع', tabBarIcon: icon('library-outline') }} />
            <Tabs.Screen name="review" options={{ title: 'مرور', tabBarIcon: icon('repeat-outline') }} />
        </Tabs>
    );
}