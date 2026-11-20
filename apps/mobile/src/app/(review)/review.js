import React, { useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { pickDueDeck } from '@/leitner';
import { colors } from '@/theme';
import Button from '@/components/Button';
import DeckSession from '@/components/DeckSession';
import ScreenHeader from '@/components/ScreenHeader';

export default function ReviewScreen() {
    const router = useRouter();
    const { id, ids } = useLocalSearchParams();
    const { words, getWordsOfSource } = useCatalog();
    const { ready, getProgress } = useProgress();

    const hasScope = id != null || ids != null; // از صفحه منبع آمده؛ بازگشت = برگشت به همان صفحه
    // بدون id: همه منابع. با id: فقط کلمات همان منبع (همراه مثال‌ها)
    const scoped = useMemo(
        () => (id != null ? getWordsOfSource(Number(id)) : words),
        [id, words, getWordsOfSource]
    );
    const selectedIds = useMemo(
        () => (ids ? new Set(String(ids).split(',').map(Number)) : null),
        [ids]
    );

    // کلمات سررسیدشده؛ اول عقب‌افتاده‌ترین‌ها (فیلتر سطح ندارد).
    // اگر کلمه‌ای انتخاب شده باشد، همان‌ها (حتی اگر هنوز سررسید نشده باشند) مرور می‌شوند
    const pick = useCallback(
        (size, exclude) => {
            const pool = selectedIds ? scoped.filter((w) => selectedIds.has(w.id)) : scoped;
            return pickDueDeck(pool, getProgress(), size, exclude);
        },
        [scoped, selectedIds, getProgress]
    );

    if (!ready) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <DeckSession
            mode="review"
            title="مرور"
            pick={pick}
            quizHref={(list) => `/(session)/quiz?ids=${list.join(',')}`}
            onExit={() => (hasScope ? router.back() : router.navigate('/'))}
            renderEmpty={() => (
                <SafeAreaView style={styles.screen} edges={['top']}>
                    <ScreenHeader title="مرور" />
                    <View style={styles.center}>
                        <Text style={styles.emoji}>✅</Text>
                        <Text style={styles.title}>امروز چیزی برای مرور نداری</Text>
                        <Text style={styles.sub}>از بخش منابع کلمه‌ها را به جعبه ۱ اضافه کن</Text>
                        <Button
                            title="رفتن به منابع"
                            onPress={() => router.navigate('/source')}
                            style={styles.btn}
                        />
                    </View>
                </SafeAreaView>
            )}
        />
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    emoji: { fontSize: 56 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 15, color: colors.sub, marginTop: 6, textAlign: 'center' },
    btn: { alignSelf: 'stretch', marginTop: 24 },
});