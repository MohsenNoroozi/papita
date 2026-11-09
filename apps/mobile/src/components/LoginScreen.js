import React, { useState } from 'react';
import { Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import Button from './Button';

export default function LoginScreen() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        setBusy(true);
        setError('');
        const err = await signIn(email.trim(), password);
        console.log('err', err)
        if (err) setError('ایمیل یا رمز عبور اشتباه است');
        setBusy(false);
    };

    return (
        <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView
                style={styles.center}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Text style={styles.brand}>PAPITA</Text>
                <TextInput
                    style={styles.input}
                    placeholder="ایمیل"
                    placeholderTextColor={colors.sub}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    style={styles.input}
                    placeholder="رمز عبور"
                    placeholderTextColor={colors.sub}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button
                    title={busy ? '...' : 'ورود'}
                    disabled={busy || !email || !password}
                    onPress={submit}
                    style={styles.btn}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
    brand: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center', marginBottom: 16 },
    input: {
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
        fontSize: 16,
        color: colors.text,
        textAlign: 'right',
        borderWidth: 1,
        borderColor: colors.border,
    },
    error: { color: colors.danger, textAlign: 'center' },
    btn: { marginTop: 8 },
});