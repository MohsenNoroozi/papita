import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getSource, getWordsOfSource } from '../../../../data/lookup';
import { useProgress } from '../../../../context/ProgressContext';
import { pickDeck } from '../../../../leitner';
import { colors } from '../../../../theme';
import Button from '../../../../components/Button';
import DeckSession from '../../../../components/DeckSession';
import ScreenHeader from '../../../../components/ScreenHeader';

export default function SourceLearn() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const sourceId = Number(id);
    const source = getSource(sourceId);
    const allWords = useMemo(() => getWordsOfSource(sourceId), [sourceId]);
    const { getProgress, getSeen } = useProgress();

    // انتخاب دسته یادگیری: کلمات بیرون از جعبه، به ترتیب کمتر دیده‌شده‌ها، بعد id
    const pick = useCallback(
        (size) => pickDeck(allWords, getProgress(), getSeen(), size),
        [allWords, getProgress, getSeen]
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
            renderEmpty={() => (
                <SafeAreaView style={styles.screen} edges={['top']}>
                    <ScreenHeader title={source.title} />
                    <View style={styles.center}>
                        <Text style={styles.emoji}>🎉</Text>
                        <Text style={styles.title}>همه کلمات این منبع در جعبه‌ها هستند</Text>
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
            )}
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