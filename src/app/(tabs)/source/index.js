import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SOURCES } from '../../../data/sources';
import { getWordsOfSource } from '../../../data/lookup';
import { useProgress } from '../../../context/ProgressContext';
import { colors } from '../../../theme';
import ProgressBar from '../../../components/ProgressBar';

export default function SourcesScreen() {
    const router = useRouter();
    const { progress } = useProgress();

    const rows = useMemo(
        () =>
            SOURCES.map((s) => {
                const words = getWordsOfSource(s.id);
                const added = words.filter((w) => progress[w.id]).length;
                return { source: s, total: words.length, added };
            }),
        [progress]
    );

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <FlatList
                data={rows}
                keyExtractor={(r) => String(r.source.id)}
                contentContainerStyle={styles.list}
                ListHeaderComponent={<Text style={styles.title}>منابع</Text>}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => router.push(`/source/${item.source.id}`)}
                        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
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
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    cardCount: { fontSize: 15, color: colors.sub, marginTop: 4 },
    cardBar: { marginTop: 14 },
    cardMeta: { fontSize: 13, color: colors.sub, marginTop: 6 },
});