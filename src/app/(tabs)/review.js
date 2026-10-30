import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { WORDS } from '../../data/words';
import { useProgress } from '../../context/ProgressContext';
import { applyAnswer, buildReviewQueue } from '../../leitner';
import { colors } from '../../theme';
import FlashCard from '../../components/FlashCard';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';

export default function ReviewScreen() {
    const router = useRouter();
    const { ready, getProgress, setEntry } = useProgress();
    const [queue, setQueue] = useState([]);
    const [total, setTotal] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (!ready) return;
            const q = buildReviewQueue(WORDS, getProgress());
            setQueue(q);
            setTotal(q.length);
        }, [ready, getProgress])
    );

    const handleSwipe = (known) => {
        const word = queue[0];
        setEntry(word.id, applyAnswer(getProgress()[word.id], known));
        setQueue((q) => q.slice(1));
    };

    if (!ready) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // هیچ کلمه‌ای سررسید نشده
    if (total === 0) {
        return (
            <SafeAreaView style={styles.center} edges={['top']}>
                <Text style={styles.emoji}>✅</Text>
                <Text style={styles.title}>امروز چیزی برای مرور نداری</Text>
                <Text style={styles.sub}>از بخش منابع کلمه‌ها را به جعبه ۱ اضافه کن</Text>
                <Button
                    title="رفتن به منابع"
                    onPress={() => router.navigate('/source')}
                    style={styles.fullBtn}
                />
            </SafeAreaView>
        );
    }

    // مرور امروز تمام شد
    if (queue.length === 0) {
        return (
            <SafeAreaView style={styles.center} edges={['top']}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.title}>مرور امروز تمام شد</Text>
                <Button title="بازگشت به صفحه امروز" onPress={() => router.navigate('/')} style={styles.fullBtn} />
            </SafeAreaView>
        );
    }

    const word = queue[0];

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>مرور</Text>
                <Text style={styles.counter}>
                    {total - queue.length + 1} / {total}
                </Text>
            </View>
            <View style={styles.bar}>
                <ProgressBar value={(total - queue.length) / total} />
            </View>

            <View style={styles.cardArea}>
                <FlashCard key={word.id} word={word} onSwipe={handleSwipe} />
            </View>

            <View style={styles.legend}>
                <Text style={[styles.legendText, { color: colors.danger }]}>← بلد نیستم</Text>
                <Text style={[styles.legendText, { color: colors.success }]}>بلدم →</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    emoji: { fontSize: 56 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 15, color: colors.sub, marginTop: 6, textAlign: 'center' },
    fullBtn: { alignSelf: 'stretch', marginTop: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    counter: { fontSize: 16, color: colors.sub },
    bar: { paddingHorizontal: 24, marginTop: 12 },
    cardArea: { flex: 1, justifyContent: 'center' },
    legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 32, paddingBottom: 24 },
    legendText: { fontSize: 16, fontWeight: '600' },
});