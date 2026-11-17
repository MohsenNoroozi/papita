import { Stack } from 'expo-router';

export const unstable_settings = {
    anchor: 'index',
};

export default function SourceLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }} />
    );
}