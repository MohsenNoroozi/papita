import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getSource, getWordsOfSource } from '../../../../data/lookup';
import { useProgress } from '../../../../context/ProgressContext';
import { MASTERED } from '../../../../leitner';
import { stopSpeaking, AUTO_PLAY_ON_LEARN } from '../../../../speech';
import { colors } from '../../../../theme';
import FlashCard from '../../../../components/FlashCard';
import Button from '../../../../components/Button';
import ProgressBar from '../../../../components/ProgressBar';
import ScreenHeader from '../../../../components/ScreenHeader';

export default function SourceLearn() {
    const { id } = useLocalSearchParams();
    const sourceId = Number(id);
    const source = getSource(sourceId);
    const words = useMemo(() => getWordsOfSource(sourceId), [sourceId]);

    const { progress, addToBox1 } = useProgress();
    const [idx, setIdx] = useState(0);

    useEffect(() => () => stopSpeaking(), []);

    if (!source || words.length === 0) {
        return (
            <SafeAreaView style={styles.screen}>
                <ScreenHeader title={source?.title ?? 'منبع'} />
                <View style={styles.center}>
                    <Text style={styles.empty}>کلمه‌ای برای این منبع پیدا نشد</Text>
                </View>
            </SafeAreaView>
        );
    }

    const word = words[idx];
    const entry = progress[word.id];
    const unadded = words.filter((w) => !progress[w.id]);

    // راست = بعدی، چپ = قبلی
    const handleSwipe = (toRight) => {
        setIdx((i) => (toRight ? Math.min(i + 1, words.length - 1) : Math.max(i - 1, 0)));
    };

    const confirmAddAll = () => {
        Alert.alert('افزودن به جعبه ۱', `${unadded.length} کلمه به جعبه ۱ اضافه شود؟`, [
            { text: 'انصراف', style: 'cancel' },
            { text: 'افزودن', onPress: () => addToBox1(unadded.map((w) => w.id)) },
        ]);
    };

    return (
        <SafeAreaView style={styles.screen}>
            <ScreenHeader
                title={source.title}
                right={<Text style={styles.counter}>{`${idx + 1} / ${words.length}`}</Text>}
            />
            <View style={styles.bar}>
                <ProgressBar value={(idx + 1) / words.length} />
            </View>

            <View style={styles.cardArea}>
                <FlashCard
                    key={word.id}
                    word={word}
                    onSwipe={handleSwipe}
                    allowLeft={idx > 0}
                    allowRight={idx < words.length - 1}
                    tint={false}
                    showExample
                    autoPlay={AUTO_PLAY_ON_LEARN}
                />
            </View>

            {/* وضعیت کلمه در جعبه‌ها */}
            <View style={styles.status}>
                {entry ? (
                    entry.box === MASTERED ? (
                        <View style={[styles.pill, styles.pillDone]}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                            <Text style={[styles.pillText, { color: colors.success }]}>یادگرفته‌شده</Text>
                        </View>
                    ) : (
                        <View style={styles.pill}>
                            <Ionicons name="cube-outline" size={20} color={colors.primary} />
                            <Text style={styles.pillText}>{`جعبه ${entry.box}`}</Text>
                        </View>
                    )
                ) : (
                    <Button
                        title="افزودن به جعبه ۱"
                        onPress={() => addToBox1([word.id])}
                        style={styles.addBtn}
                    />
                )}
            </View>

            <View style={styles.legend}>
                <Text style={[styles.legendText, idx === 0 && styles.legendOff]}>← قبلی</Text>
                <Text style={[styles.legendText, idx === words.length - 1 && styles.legendOff]}>بعدی →</Text>
            </View>

            <View style={styles.footer}>
                {unadded.length > 0 ? (
                    <Button
                        variant="soft"
                        title={`افزودن همه به جعبه ۱ (${unadded.length} کلمه)`}
                        onPress={confirmAddAll}
                    />
                ) : (
                    <Text style={styles.allDone}>همه کلمات این منبع در جعبه‌ها هستند ✓</Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { fontSize: 16, color: colors.sub },
    counter: { fontSize: 15, color: colors.sub },
    bar: { paddingHorizontal: 24, marginTop: 4 },
    cardArea: { flex: 1, justifyContent: 'center' },

    status: { minHeight: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    addBtn: { paddingVertical: 12, paddingHorizontal: 28 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.primarySoft,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
    },
    pillDone: { backgroundColor: colors.successSoft },
    pillText: { fontSize: 16, fontWeight: '700', color: colors.primary },

    legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 8 },
    legendText: { fontSize: 15, fontWeight: '600', color: colors.sub },
    legendOff: { opacity: 0.3 },

    footer: { padding: 20, paddingTop: 8, minHeight: 80, justifyContent: 'center' },
    allDone: { textAlign: 'center', fontSize: 15, color: colors.success, fontWeight: '600' },
});