import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCatalog } from '../../../../context/CatalogContext';
import { useProgress } from '../../../../context/ProgressContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
    INTERVALS_DAYS,
    MASTERED,
    DECK_SIZE_OPTIONS,
    isForLevel,
    isRelevant,
} from '../../../../leitner';
import { colors } from '../../../../theme';
import BoxesOverview from '../../../../components/BoxesOverview';
import BoxStars from '../../../../components/BoxStars';
import RoundIconButton from '../../../../components/RoundIconButton';
import ScreenHeader from '../../../../components/ScreenHeader';
import SpeakButton from '../../../../components/SpeakButton';
import SplitButton from '../../../../components/SplitButton';

const FOOTER_HEIGHT = 72;

export default function SourceScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const sourceId = Number(id);
    const { getSource, getWordsOfSource } = useCatalog();
    const source = getSource(sourceId);
    const words = useMemo(() => getWordsOfSource(sourceId), [getWordsOfSource, sourceId]);

    const { progress } = useProgress();
    const { deckSize, setDeckSize, level } = useSettings();
    const [menuOpen, setMenuOpen] = useState(false);

    // با ترک صفحه، منو بسته شود
    useFocusEffect(useCallback(() => () => setMenuOpen(false), []));

    // تعداد کلمات این منبع در هر جعبه
    const boxData = useMemo(() => {
        const counts = Array(INTERVALS_DAYS.length).fill(0);
        let mastered = 0;
        for (const w of words) {
            const e = progress[w.id];
            if (!e) continue;
            if (e.box === MASTERED) mastered += 1;
            else counts[e.box - 1] += 1;
        }
        return { counts, mastered };
    }, [words, progress]);

    if (!source) {
        return (
            <SafeAreaView style={styles.screen} edges={['top']}>
                <ScreenHeader title="منبع" />
                <View style={styles.center}>
                    <Text style={styles.empty}>این منبع پیدا نشد</Text>
                </View>
            </SafeAreaView>
        );
    }

    // کلمات مرتبط با سطح (یا داخل جعبه) برای مخرج‌ها؛ کلمات جدیدِ قابل پیشنهاد برای دکمه یادگیری
    const relevantCount = words.filter((w) => isRelevant(w, progress, level)).length;
    const belowCount = words.length - relevantCount;
    const unboxed = words.filter((w) => !progress[w.id] && isForLevel(w, level)).length;
    const deckCount = Math.min(deckSize, unboxed);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScreenHeader title={source.title} />

            <FlatList
                style={styles.flex}
                data={words}
                extraData={[progress, level]}
                keyExtractor={(w) => String(w.id)}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <BoxesOverview
                            counts={boxData.counts}
                            mastered={boxData.mastered}
                            total={relevantCount}
                        />
                        <Text style={styles.count}>
                            {words.length} کلمه
                            {belowCount > 0 ? ` · ${belowCount} کلمه پایین‌تر از سطح تو` : ''}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={[styles.row, !isRelevant(item, progress, level) && styles.rowBelow]}>
                        <SpeakButton text={item.en} size={18} />
                        <View style={styles.wordCol}>
                            <Text style={styles.en}>{item.en}</Text>
                            <BoxStars box={progress[item.id]?.box} size={14} style={styles.stars} />
                        </View>
                        <Text style={styles.fa}>{item.fa}</Text>
                    </View>
                )}
            />

            {/* لمس بیرون از منو، آن را می‌بندد */}
            {menuOpen && (
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            )}

            <View style={styles.footer}>
                <SplitButton
                    style={styles.flex}
                    title={deckCount > 0 ? `یادگیری (${deckCount} کلمه)` : 'یادگیری'}
                    disabled={unboxed === 0}
                    open={menuOpen}
                    onPress={() => {
                        setMenuOpen(false);
                        router.push(`/source/${source.id}/learn`);
                    }}
                    onToggle={() => setMenuOpen((o) => !o)}
                />
                <RoundIconButton
                    icon="extension-puzzle-outline"
                    size={56}
                    disabled={words.length === 0}
                    onPress={() => router.push(`/source/${source.id}/quiz`)}
                    accessibilityLabel="آزمون همه کلمات"
                />
            </View>

            {/* گزینه‌های تعداد کلمات دسته؛ بالای دکمه */}
            {menuOpen && (
                <View style={styles.menu}>
                    {DECK_SIZE_OPTIONS.map((n) => {
                        const selected = n === deckSize;
                        return (
                            <Pressable
                                key={n}
                                style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]}
                                onPress={() => {
                                    setDeckSize(n);
                                    setMenuOpen(false);
                                }}
                            >
                                <Text style={[styles.menuText, selected && styles.menuTextOn]}>
                                    {`${n} کلمه`}
                                </Text>
                                {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { fontSize: 16, color: colors.sub },
    list: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
    header: { gap: 10, marginBottom: 2 },
    count: { fontSize: 14, color: colors.sub, textAlign: 'center' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    rowBelow: { opacity: 0.45 }, // کلمه پایین‌تر از سطح که در جعبه نیست
    wordCol: { flex: 1, gap: 4 },
    en: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
    stars: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
    fa: { flex: 1, fontSize: 16, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: FOOTER_HEIGHT,
        paddingHorizontal: 20,
    },

    menu: {
        position: 'absolute',
        left: 20,
        bottom: FOOTER_HEIGHT + 6,
        width: 160,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 6,
        zIndex: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuPressed: { backgroundColor: colors.bg },
    menuText: { fontSize: 16, color: colors.text },
    menuTextOn: { fontWeight: '800', color: colors.primary },
});