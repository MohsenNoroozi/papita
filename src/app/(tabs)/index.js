import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { WORDS } from '../../data/words';
import { useProgress } from '../../context/ProgressContext';
import { getDueWords, getNewWords, MASTERED } from '../../leitner';
import { colors } from '../../theme';
import Button from '../../components/Button';

export default function Home() {
    const router = useRouter();
    const { ready, progress, reset, shiftDays } = useProgress();

    const stats = useMemo(() => {
        const entries = Object.values(progress);
        const mastered = entries.filter((e) => e.box === MASTERED).length;
        return {
            due: getDueWords(WORDS, progress).length,
            fresh: getNewWords(WORDS, progress).length,
            learning: entries.length - mastered,
            mastered,
        };
    }, [progress]);

    if (!ready) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>امروز</Text>

                {/* کارت مرور */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>مرور</Text>
                    <Text style={styles.big}>{stats.due}</Text>
                    <Text style={styles.cardSub}>
                        {stats.due > 0 ? 'کلمه برای مرور آماده است' : 'امروز چیزی برای مرور نداری'}
                    </Text>
                    <Button
                        title="شروع مرور"
                        disabled={stats.due === 0}
                        onPress={() => router.navigate('/review')}
                        style={styles.cardBtn}
                    />
                </View>

                {/* کارت یادگیری */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>یادگیری</Text>
                    <Text style={styles.big}>{stats.fresh}</Text>
                    <Text style={styles.cardSub}>
                        {stats.fresh > 0 ? 'کلمه جدید در انتظار توست' : 'همه کلمات را یاد گرفتی 🎉'}
                    </Text>
                    <Button
                        title="انتخاب منبع برای یادگیری"
                        disabled={stats.fresh === 0}
                        onPress={() => router.navigate('/source')}
                        style={styles.cardBtn}
                    />
                </View>

                {/* آمار کوتاه */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>{stats.learning}</Text>
                        <Text style={styles.statLabel}>در حال یادگیری</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>{stats.mastered}</Text>
                        <Text style={styles.statLabel}>کاملاً یادگرفته</Text>
                    </View>
                </View>

                {__DEV__ && (
                    <View style={styles.dev}>
                        <Text style={styles.devTitle}>ابزار تست (فقط حالت توسعه)</Text>
                        <Pressable onPress={() => shiftDays(1)}>
                            <Text style={styles.devLink}>⏩ یک روز جلو ببر</Text>
                        </Pressable>
                        <Pressable onPress={reset}>
                            <Text style={styles.devLink}>🗑 پاک کردن همه پیشرفت</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    content: { padding: 20, gap: 16 },
    title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 4 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 22,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    cardLabel: { fontSize: 15, fontWeight: '700', color: colors.primary },
    big: { fontSize: 56, fontWeight: '800', color: colors.text, marginTop: 4 },
    cardSub: { fontSize: 16, color: colors.sub, marginBottom: 16 },
    cardBtn: { alignSelf: 'stretch' },
    statsRow: { flexDirection: 'row', gap: 12 },
    stat: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 16, alignItems: 'center' },
    statNum: { fontSize: 24, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 13, color: colors.sub, marginTop: 2 },
    dev: { marginTop: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, gap: 8 },
    devTitle: { fontSize: 12, color: colors.sub },
    devLink: { fontSize: 15, color: colors.primary },
});