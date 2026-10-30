import { Stack } from 'expo-router';

export default function SourceLayout() {
    return (
        <Stack screenOptions={{headerShown: false}}>
            <Stack.Screen
                name="index"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="[id]/index"
                options={{ headerShown: false }}
            />
        </Stack>
    );
}