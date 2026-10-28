import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { WORDS } from '../../data/words';
import { useProgress } from '../../context/ProgressContext';
import { getNewWords, LEARN_BATCH_SIZE } from '../../leitner';
import { colors } from '../../theme';
import Button from '../../components/Button';

const STEPS = [
    { n: '۱', text: `${LEARN_BATCH_SIZE} کلمه را با ترجمه و جمله مثال ببین` },
    { n: '۲', text: 'با یک آزمون کوتاه تمرینشان کن' },
    { n: '۳', text: 'فردا در بخش مرور برمی‌گردند' },
];

export default function LearnTab() {
    const router = useRouter();
    const { ready, progress } = useProgress();
    const fresh = ready ? getNewWords(WORDS, progress).length : 0;

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.hero}>
                <Text style={styles.emoji}>💡</Text>
                <Text style={styles.title}>یادگیری کلمات جدید</Text>
                <Text style={styles.sub}>
                    {fresh > 0 ? `${fresh} کلمه جدید در انتظار توست` : 'همه کلمات را یاد گرفتی 🎉'}
                </Text>
            </View>

            <View style={styles.steps}>
                {STEPS.map((s) => (
                    <View key={s.n} style={styles.step}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{s.n}</Text>
                        </View>
                        <Text style={styles.stepText}>{s.text}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <Button
                    title="شروع"
                    disabled={fresh === 0}
                    onPress={() => router.push('/learn-session')}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, padding: 24 },
    hero: { alignItems: 'center', marginTop: 40 },
    emoji: { fontSize: 64 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 12 },
    sub: { fontSize: 16, color: colors.sub, marginTop: 6 },
    steps: { marginTop: 36, gap: 14 },
    step: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 16, borderRadius: 18 },
    badge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    badgeText: { color: colors.primary, fontWeight: '800' },
    stepText: { flex: 1, fontSize: 16, color: colors.text, textAlign: 'right' },
    footer: { flex: 1, justifyContent: 'flex-end' },
});