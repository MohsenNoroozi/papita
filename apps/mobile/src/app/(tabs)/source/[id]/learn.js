import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCatalog } from '../../../../context/CatalogContext';
import { useProgress } from '../../../../context/ProgressContext';
import { useSettings } from '../../../../context/SettingsContext';
import { pickDeck, pickMixedDeck, isForLevel } from '../../../../leitner';
import { colors } from '../../../../theme';
import Button from '../../../../components/Button';
import DeckSession from '../../../../components/DeckSession';
import ScreenHeader from '../../../../components/ScreenHeader';

export default function SourceLearn() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    // بدون id (مسیر /learn از داشبورد) = یادگیری ترکیبی از همه منابع
    const isMixed = id == null;
    const sourceId = Number(id);

    const { words: catalogWords, sources, getSource, getWordsOfSource } = useCatalog();
    const source = isMixed ? null : getSource(sourceId);
    const allWords = useMemo(
        () => (isMixed ? [] : getWordsOfSource(sourceId)),
        [isMixed, getWordsOfSource, sourceId]
    );
    const { getProgress, getSeen } = useProgress();
    const { level } = useSettings();

    const title = isMixed ? 'یادگیری' : source?.title ?? 'منبع';

    // دسته یادگیری: منبع واحد یا ترکیب منابع؛ هر دو سطح‌محور و کمتر دیده‌شده‌ها اول
    const pick = useCallback(
        (size) =>
            isMixed
                ? pickMixedDeck(sources, getWordsOfSource, getProgress(), getSeen(), size, level)
                : pickDeck(allWords, getProgress(), getSeen(), size, level),
        [isMixed, sources, getWordsOfSource, allWords, getProgress, getSeen, level]
    );

    if (!isMixed && (!source || allWords.length === 0)) {
        return (
            <SafeAreaView style={styles.screen} edges={['top']}>
                <ScreenHeader title={title} />
                <View style={styles.center}>
                    <Text style={styles.empty}>کلمه‌ای برای این منبع پیدا نشد</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <DeckSession
            mode="learn"
            title={title}
            pick={pick}
            quizHref={(ids) =>
                isMixed
                    ? `/quiz?ids=${ids.join(',')}`
                    : `/source/${source.id}/quiz?ids=${ids.join(',')}`
            }
            onExit={() => router.back()}
            renderEmpty={() => {
                // کلماتی که بیرون از جعبه‌اند ولی چون زیر سطح کاربرند پیشنهاد نمی‌شوند
                const progress = getProgress();
                const pool = isMixed ? catalogWords : allWords;
                const belowLevel = pool.filter((w) => !progress[w.id] && !isForLevel(w, level)).length;
                return (
                    <SafeAreaView style={styles.screen} edges={['top']}>
                        <ScreenHeader title={title} />
                        <View style={styles.center}>
                            <Text style={styles.emoji}>🎉</Text>
                            <Text style={styles.title}>
                                {belowLevel > 0
                                    ? `کلمات مناسب سطحت تمام شد. ${belowLevel} کلمه پایین‌تر از سطح توست`
                                    : isMixed
                                        ? 'همه کلمات در جعبه‌ها هستند'
                                        : 'همه کلمات این منبع در جعبه‌ها هستند'}
                            </Text>
                            <View style={styles.actions}>
                                {!isMixed && (
                                    <Button
                                        variant="soft"
                                        title="آزمون همه کلمات"
                                        onPress={() => router.push(`/source/${source.id}/quiz`)}
                                    />
                                )}
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