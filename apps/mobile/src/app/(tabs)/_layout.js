import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarInsetProvider } from '@/context/BarInsetContext';
import { colors } from '@/theme';

export default function AppLayout() {
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

    return (
        <BarInsetProvider value={0}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.barActive,
                    tabBarInactiveTintColor: colors.barInactive,
                    tabBarLabelStyle: styles.label,
                    tabBarItemStyle: styles.item,
                    tabBarStyle: [styles.bar, { height: 56 + bottomInset, paddingBottom: bottomInset }],
                    sceneStyle: { backgroundColor: colors.bg },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'خانه',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="source"
                    options={{
                        title: 'منابع',
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'library' : 'library-outline'} size={22} color={color} />
                        ),
                    }}
                />
            </Tabs>
        </BarInsetProvider>
    );
}

const styles = StyleSheet.create({
    bar: {
        backgroundColor: colors.bar,
        borderTopColor: colors.barBorder,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 4,
        elevation: 6,
    },
    item: { paddingTop: 0 },
    label: { fontSize: 11, fontWeight: '700' },
});
