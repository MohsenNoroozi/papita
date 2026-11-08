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
                </Stack>
            </ProgressProvider>
        </SettingsProvider>
    );
}