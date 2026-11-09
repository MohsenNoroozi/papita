import React, { useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useCatalog } from '../../context/CatalogContext';
import { useProgress } from '../../context/ProgressContext';
import { pickDueDeck } from '../../leitner';
import { colors } from '../../theme';
import Button from '../../components/Button';
import DeckSession from '../../components/DeckSession';
import ScreenHeader from '../../components/ScreenHeader';

export default function ReviewScreen() {
    const router = useRouter();
    const { words } = useCatalog();
    const { ready, getProgress } = useProgress();

    // کلمات سررسیدشده از همه منابع؛ اول عقب‌افتاده‌ترین‌ها (فیلتر سطح ندارد)
    const pick = useCallback(
        (size, exclude) => pickDueDeck(words, getProgress(), size, exclude),
        [words, getProgress]
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
            showBack={false}
            pick={pick}
            quizHref={(ids) => `/quiz?ids=${ids.join(',')}`}
            onExit={() => router.navigate('/')}
            renderEmpty={() => (
                <SafeAreaView style={styles.screen} edges={['top']}>
                    <ScreenHeader title="مرور" showBack={false} />
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