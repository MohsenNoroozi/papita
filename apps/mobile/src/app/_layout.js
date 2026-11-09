import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { ProgressProvider } from '../context/ProgressContext';
import { CatalogProvider, useCatalog } from '../context/CatalogContext';
import LoginScreen from '../components/LoginScreen';
import Button from '../components/Button';
import { colors } from '../theme';

// تا کاتالوگ برای بار اول از سرور نیامده، اپ نمایش داده نمی‌شود
function CatalogGate({ children }) {
    const { ready, status, retry } = useCatalog();
    const { signOut } = useAuth();

    if (ready) return children;

    return (
        <View style={styles.center}>
            {status === 'loading' ? (
                <ActivityIndicator size="large" />
            ) : (
                <>
                    <Text style={styles.text}>
                        {status === 'error'
                            ? 'برای دریافت کلمات، بار اول باید به اینترنت وصل باشی'
                            : 'هنوز کلمه‌ای روی سرور وجود ندارد'}
                    </Text>
                    <Button title="تلاش دوباره" onPress={retry} style={styles.btn} />
                    <Button title="خروج از حساب" variant="ghost" onPress={signOut} style={styles.btn} />
                </>
            )}
        </View>
    );
}

function Root() {
    const { ready, session } = useAuth();

    if (!ready) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }
    if (!session) return <LoginScreen />;

    // key: با عوض شدن کاربر، همه providerهای زیرین از نو ساخته می‌شوند
    return (
        <SettingsProvider key={session.user.id}>
            <ProgressProvider>
                <CatalogProvider>
                    <CatalogGate>
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        </Stack>
                    </CatalogGate>
                </CatalogProvider>
            </ProgressProvider>
        </SettingsProvider>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <Root />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
        backgroundColor: colors.bg,
    },
    text: { fontSize: 16, color: colors.text, textAlign: 'center' },
    btn: { alignSelf: 'stretch' },
});