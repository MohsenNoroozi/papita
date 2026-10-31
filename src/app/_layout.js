import React from 'react';
import { Stack } from 'expo-router';
import { ProgressProvider } from '../context/ProgressContext';
import { SettingsProvider } from '../context/SettingsContext';

export default function RootLayout() {
    return (
        <SettingsProvider>
            <ProgressProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    {/* اگر learn-session.js را حذف کرده‌اید، این بخش را هم پاک کنید */}
                    <Stack.Screen
                        name="learn-session"
                        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
                    />
                </Stack>
            </ProgressProvider>
        </SettingsProvider>
    );
}