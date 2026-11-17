import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { LEVELS, levelLabel } from '@/leitner';
import { colors } from '@/theme';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import { useRefresh } from '@/context/RefreshContext';

export default function ProfileScreen() {
    const { signOut } = useAuth();
    const { profile, email, updateProfile, uploadAvatar } = useProfile();
    const { syncNow, pendingCount } = useProgress();
    const { level, setLevel } = useSettings();
    const { refreshing, refreshAll } = useRefresh();

    const [name, setName] = useState(profile?.fullname ?? '');
    const [savingName, setSavingName] = useState(false);
    const [uploading, setUploading] = useState(false);

    // بعد از رسیدن پروفایل از سرور، نام در فیلد قرار می‌گیرد
    useEffect(() => {
        if (profile?.fullname != null) setName(profile.fullname);
    }, [profile?.fullname]);

    const trimmed = name.trim();
    const nameChanged = !!profile && trimmed !== profile.fullname;

    const saveName = async () => {
        setSavingName(true);
        const err = await updateProfile({ fullname: trimmed });
        setSavingName(false);
        if (err) Alert.alert('ذخیره نشد', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کن.');
    };

    const pickAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('دسترسی لازم است', 'برای انتخاب عکس باید دسترسی به گالری را مجاز کنی.');
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (res.canceled) return;

        setUploading(true);
        try {
            // باکت فقط JPEG (حداکثر ۲ مگابایت) می‌پذیرد
            const img = await ImageManipulator.manipulateAsync(
                res.assets[0].uri,
                [{ resize: { width: 512 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            const err = await uploadAvatar(img.base64);
            if (err) throw err;
        } catch (e) {
            console.warn('avatar upload failed:', e);
            Alert.alert('آپلود نشد', 'تصویر ذخیره نشد. اینترنت را بررسی کن و دوباره تلاش کن.');
        } finally {
            setUploading(false);
        }
    };

    const chooseLevel = (l) => {
        setLevel(l);
        updateProfile({ level: l }); // ذخیره روی سرور؛ اگر آفلاین بود، فقط محلی می‌ماند
    };

    // قبل از خروج، پیشرفت به سرور فرستاده می‌شود
    const logout = async () => {
        const ok = await syncNow();
        if (!ok && pendingCount() > 0) {
            Alert.alert(
                'تغییرات ذخیره‌نشده',
                'اینترنت وصل نیست و بعضی پیشرفت‌ها هنوز به سرور نرفته‌اند. با خروج از بین می‌روند.',
                [
                    { text: 'انصراف', style: 'cancel' },
                    { text: 'خروج', style: 'destructive', onPress: signOut },
                ]
            );
            return;
        }
        signOut();
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <ScreenHeader title="پروفایل" />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}>
                    {/* آواتار */}
                    <View style={styles.avatarWrap}>
                        <Pressable onPress={pickAvatar} disabled={uploading} accessibilityLabel="تغییر آواتار">
                            <Avatar uri={profile?.avatar_url} size={110} style={uploading && styles.dim} />
                            <View style={styles.camera}>
                                <Ionicons name={uploading ? 'hourglass-outline' : 'camera'} size={18} color="#fff" />
                            </View>
                        </Pressable>
                    </View>

                    {/* نام */}
                    <View style={styles.card}>
                        <Text style={styles.label}>نام</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="نام و نام خانوادگی"
                            placeholderTextColor={colors.sub}
                        />
                        <Button
                            title={savingName ? '...' : 'ذخیره نام'}
                            disabled={!nameChanged || !trimmed || savingName}
                            onPress={saveName}
                        />
                    </View>

                    {/* ایمیل (فقط نمایش) */}
                    <View style={styles.card}>
                        <Text style={styles.label}>ایمیل</Text>
                        <TextInput
                            style={[styles.input, styles.readonly]}
                            value={email ?? ''}
                            editable={false}
                            selectTextOnFocus={false}
                        />
                    </View>

                    {/* سطح من */}
                    <View style={styles.card}>
                        <Text style={styles.label}>سطح من</Text>
                        <View style={styles.levels}>
                            {LEVELS.map((l) => (
                                <Pressable
                                    key={l}
                                    onPress={() => chooseLevel(l)}
                                    style={[styles.chip, l === level && styles.chipOn]}
                                >
                                    <Text style={[styles.chipText, l === level && styles.chipTextOn]}>
                                        {levelLabel(l)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Text style={styles.hint}>
                            کلمه‌های پایین‌تر از سطح پیشنهاد نمی‌شوند، ولی کلمه‌های داخل جعبه همچنان مرور می‌شوند
                        </Text>
                    </View>

                    <Pressable onPress={logout} style={styles.logout}>
                        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                        <Text style={styles.logoutText}>خروج از حساب</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    content: { padding: 20, gap: 14 },
    avatarWrap: { alignItems: 'center', marginVertical: 8 },
    dim: { opacity: 0.5 },
    camera: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primary,
        borderWidth: 3,
        borderColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 10 },
    label: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' },
    input: {
        backgroundColor: colors.bg,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.text,
        textAlign: 'right',
    },
    readonly: { color: colors.sub, textAlign: 'left', writingDirection: 'ltr' },
    levels: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    chip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: colors.bg },
    chipOn: { backgroundColor: colors.primary },
    chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
    chipTextOn: { color: '#FFFFFF' },
    hint: { fontSize: 12, color: colors.sub, textAlign: 'right' },
    logout: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
    },
    logoutText: { fontSize: 15, fontWeight: '700', color: colors.danger },
});
