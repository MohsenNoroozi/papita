import React from 'react';
import { Stack } from 'expo-router';
import { ProgressProvider } from '../context/ProgressContext';

export default function RootLayout() {
    return (
        <ProgressProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="learn-session"
                    options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
                />
            </Stack>
        </ProgressProvider>
    );
}