import React, { useCallback, useMemo } from 'react';
import { View, Text, FlatList, BackHandler, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { BOX_NEW, BOX_MASTERED, INTERVALS_DAYS, wordsInBox } from '@/leitner';
import { colors } from '@/theme';
import BoxStars from '@/components/BoxStars';
import ScreenHeader from '@/components/ScreenHeader';
import SpeakButton from '@/components/SpeakButton';

function titleOf(key) {
    if (key === BOX_NEW) return 'کلمات جدید';
    if (key === BOX_MASTERED) return 'کاملاً یادگرفته';
    const n = Number(key);
    return `جعبه ${n}${INTERVALS_DAYS[n - 1] ? ` · هر ${INTERVALS_DAYS[n - 1]} روز` : ''}`;
}

export default function BoxScreen() {
    const router = useRouter();
    const { key } = useLocalSearchParams();
    const { words: all } = useCatalog();
    const { progress } = useProgress();
    const { level } = useSettings();

    const goHome = useCallback(() => router.navigate('/'), [router]);

    useFocusEffect(
        useCallback(() => {
            const sub = BackHandler.addEventListener('hardwareBackPress', () => {
                goHome();
                return true;
            });
            return () => sub.remove();
        }, [goHome])
    );

    const list = useMemo(() => {
        const l = wordsInBox(all, progress, key, level);
        // جعبه‌ها: زودتر سررسید شونده اول؛ بقیه: ترتیب id
        return l.sort((a, b) => (progress[a.id]?.due ?? 0) - (progress[b.id]?.due ?? 0) || a.id - b.id);
    }, [all, progress, key, level]);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScreenHeader title={titleOf(key)} onBack={goHome} />
            <FlatList
                data={list}
                keyExtractor={(w) => String(w.id)}
                contentContainerStyle={styles.list}
                ListHeaderComponent={<Text style={styles.count}>{list.length} کلمه</Text>}
                ListEmptyComponent={<Text style={styles.empty}>کلمه‌ای در این جعبه نیست</Text>}
                renderItem={({ item }) => (
                    <View style={styles.row}>
                        <SpeakButton text={item.en} size={18} />
                        <View style={styles.wordCol}>
                            <Text style={styles.en}>{item.en}</Text>
                            <BoxStars box={progress[item.id]?.box} size={14} style={styles.stars} />
                        </View>
                        <Text style={styles.fa}>{item.fa}</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    list: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
    count: { fontSize: 14, color: colors.sub, textAlign: 'center', marginBottom: 6 },
    empty: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 24 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    wordCol: { flex: 1, gap: 4 },
    en: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
    stars: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
    fa: { flex: 1, fontSize: 16, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },
});