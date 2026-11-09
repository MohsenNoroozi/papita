import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCatalog } from '../../../context/CatalogContext';
import { useProgress } from '../../../context/ProgressContext';
import { useSettings } from '../../../context/SettingsContext';
import { isRelevant } from '../../../leitner';
import { colors } from '../../../theme';
import ProgressBar from '../../../components/ProgressBar';

export default function SourcesScreen() {
    const router = useRouter();
    const { sources, getWordsOfSource } = useCatalog();
    const { progress } = useProgress();
    const { level, hideEasySources, setHideEasySources } = useSettings();

    const allRows = useMemo(
        () =>
            sources.map((s) => {
                const words = getWordsOfSource(s.id);
                // فقط کلمات مرتبط با سطح (یا داخل جعبه) در شمارش و نوار پیشرفت می‌آیند
                const relevant = words.filter((w) => isRelevant(w, progress, level));
                const added = relevant.filter((w) => progress[w.id]).length;
                return {
                    source: s,
                    total: relevant.length,
                    added,
                    below: words.length - relevant.length,
                    // همه کلمات منبع پایین‌تر از سطح کاربر است و هیچ‌کدام در جعبه نیست
                    dimmed: words.length > 0 && relevant.length === 0,
                };
            }),
        [sources, getWordsOfSource, progress, level]
    );

    const hasDimmed = allRows.some((r) => r.dimmed);
    const rows = hideEasySources ? allRows.filter((r) => !r.dimmed) : allRows;

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <FlatList
                data={rows}
                keyExtractor={(r) => String(r.source.id)}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View>
                        <Text style={styles.title}>منابع</Text>
                        {hasDimmed && (
                            <View style={styles.toggleRow}>
                                <Text style={styles.toggleText}>پنهان کردن منابع پایین‌تر از سطح من</Text>
                                <Switch value={hideEasySources} onValueChange={setHideEasySources} />
                            </View>
                        )}
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => router.push(`/source/${item.source.id}`)}
                        style={({ pressed }) => [
                            styles.card,
                            item.dimmed && styles.dimmed,
                            pressed && styles.pressed,
                        ]}
                    >
                        <View style={styles.cardTop}>
                            <Text style={styles.cardTitle}>{item.source.title}</Text>
                            <Ionicons name="chevron-forward" size={22} color={colors.sub} />
                        </View>
                        <Text style={styles.cardCount}>{item.total} کلمه</Text>
                        <View style={styles.cardBar}>
                            <ProgressBar value={item.total ? item.added / item.total : 0} />
                        </View>
                        <Text style={styles.cardMeta}>
                            {item.added} از {item.total} در جعبه‌ها
                            {item.below > 0 ? ` · ${item.below} کلمه پایین‌تر از سطح تو` : ''}
                        </Text>
                    </Pressable>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 20, gap: 14 },
    title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 6 },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    toggleText: { fontSize: 14, color: colors.sub },
    card: {
        backgroundColor: colors.card,
        borderRadius: 22,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    dimmed: { opacity: 0.5 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    cardCount: { fontSize: 15, color: colors.sub, marginTop: 4 },
    cardBar: { marginTop: 14 },
    cardMeta: { fontSize: 13, color: colors.sub, marginTop: 6 },
});