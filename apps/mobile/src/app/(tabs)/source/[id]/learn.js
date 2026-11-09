import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCatalog } from '../../../../context/CatalogContext';
import { useProgress } from '../../../../context/ProgressContext';
import { useSettings } from '../../../../context/SettingsContext';
import { pickDeck, isForLevel } from '../../../../leitner';
import { colors } from '../../../../theme';
import Button from '../../../../components/Button';
import DeckSession from '../../../../components/DeckSession';
import ScreenHeader from '../../../../components/ScreenHeader';

export default function SourceLearn() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const sourceId = Number(id);
    const { getSource, getWordsOfSource } = useCatalog();
    const source = getSource(sourceId);
    const allWords = useMemo(() => getWordsOfSource(sourceId), [getWordsOfSource, sourceId]);
    const { getProgress, getSeen } = useProgress();
    const { level } = useSettings();

    // دسته یادگیری: کلمات بیرون از جعبه و مناسب سطح؛ هم‌سطح اول، بعد کمتر دیده‌شده‌ها، بعد id
    const pick = useCallback(
        (size) => pickDeck(allWords, getProgress(), getSeen(), size, level),
        [allWords, getProgress, getSeen, level]
    );

    if (!source || allWords.length === 0) {
        return (
            <SafeAreaView style={styles.screen} edges={['top']}>
                <ScreenHeader title={source?.title ?? 'منبع'} />
                <View style={styles.center}>
                    <Text style={styles.empty}>کلمه‌ای برای این منبع پیدا نشد</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <DeckSession
            mode="learn"
            title={source.title}
            pick={pick}
            quizHref={(ids) => `/source/${source.id}/quiz?ids=${ids.join(',')}`}
            onExit={() => router.back()}
            renderEmpty={() => {
                // کلماتی که بیرون از جعبه‌اند ولی چون زیر سطح کاربرند پیشنهاد نمی‌شوند
                const progress = getProgress();
                const belowLevel = allWords.filter(
                    (w) => !progress[w.id] && !isForLevel(w, level)
                ).length;
                return (
                    <SafeAreaView style={styles.screen} edges={['top']}>
                        <ScreenHeader title={source.title} />
                        <View style={styles.center}>
                            <Text style={styles.emoji}>🎉</Text>
                            <Text style={styles.title}>
                                {belowLevel > 0
                                    ? `کلمات مناسب سطحت تمام شد. ${belowLevel} کلمه پایین‌تر از سطح توست`
                                    : 'همه کلمات این منبع در جعبه‌ها هستند'}
                            </Text>
                            <View style={styles.actions}>
                                <Button
                                    variant="soft"
                                    title="آزمون همه کلمات"
                                    onPress={() => router.push(`/source/${source.id}/quiz`)}
                                />
                                <Button variant="ghost" title="بازگشت" onPress={() => router.back()} />
                            </View>
                        </View>
                    </SafeAreaView>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    empty: { fontSize: 16, color: colors.sub },
    emoji: { fontSize: 56 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 8 },
    actions: { alignSelf: 'stretch', marginTop: 24, gap: 4 },
});