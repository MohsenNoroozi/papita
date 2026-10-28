import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const icon = (name) => ({ color, size }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'امروز', tabBarIcon: icon('today-outline') }} />
            <Tabs.Screen name="learn" options={{ title: 'یادگیری', tabBarIcon: icon('bulb-outline') }} />
            <Tabs.Screen name="review" options={{ title: 'مرور', tabBarIcon: icon('repeat-outline') }} />
        </Tabs>
    );
}