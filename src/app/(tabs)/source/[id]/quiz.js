import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { WORDS } from '../../../../data/words';
import { getSource, getWordsOfSource } from '../../../../data/lookup';
import { useProgress } from '../../../../context/ProgressContext';
import { shuffle } from '../../../../leitner';
import { speak, stopSpeaking } from '../../../../speech';
import { useSettings } from '../../../../context/SettingsContext';
import { colors } from '../../../../theme';
import Button from '../../../../components/Button';
import FadeIn from '../../../../components/FadeIn';
import ProgressBar from '../../../../components/ProgressBar';
import ScreenHeader from '../../../../components/ScreenHeader';
import SpeakButton from '../../../../components/SpeakButton';
import RoundIconButton from '../../../../components/RoundIconButton';
import LearnedAllDialog from '../../../../components/LearnedAllDialog';

// جهت‌های پرسش. برای آزمون کوتاه‌تر فقط ['en2fa'] بگذارید
const DIRECTIONS = ['en2fa', 'fa2en'];

// ساخت یک سؤال: type = 'en2fa' (معنی فارسی را انتخاب کن) یا 'fa2en' (کلمه انگلیسی را انتخاب کن)
function makeItem(word, type, pool) {
    const field = type === 'en2fa' ? 'fa' : 'en';
    const others = shuffle(
        pool.filter((w) => w.id !== word.id && w[field] !== word[field])
    ).slice(0, 3);
    return {
        id: Math.random().toString(36).slice(2),
        word,
        type,
        options: shuffle([word, ...others]),
    };
}

function buildQueue(words, pool) {
    return DIRECTIONS.flatMap((type) => shuffle(words).map((w) => makeItem(w, type, pool)));
}

export default function SourceQuiz() {
    const router = useRouter();
    const { id, ids } = useLocalSearchParams();
    const sourceId = Number(id);
    const source = getSource(sourceId);
    const sourceWords = useMemo(() => getWordsOfSource(sourceId), [sourceId]);
    const isDeckQuiz = !!ids;
    const words = useMemo(() => {
        if (!ids) return sourceWords; // آزمون کل منبع
        const wanted = new Set(String(ids).split(',').map(Number));
        // اگر منبع مشخص نباشد (مثلاً از صفحه مرور)، از بین همه کلمات انتخاب می‌شود
        return (id ? sourceWords : WORDS).filter((w) => wanted.has(w.id));
    }, [id, ids, sourceWords]);
    // گزینه‌های غلط ترجیحاً از کل کلمات همین منبع انتخاب می‌شوند
    const pool = sourceWords.length >= 4 ? sourceWords : WORDS;

    const { progress, addToBox1 } = useProgress();
    const { autoSpeak } = useSettings();
    const autoSpeakRef = useRef(autoSpeak);
    autoSpeakRef.current = autoSpeak;
    const skipFirstSpeech = useRef(true); // اولین سؤال هنگام باز شدن صفحه خوانده نمی‌شود

    const [queue, setQueue] = useState(() => buildQueue(words, pool));
    const [correct, setCorrect] = useState(0);
    const [selected, setSelected] = useState(null);
    const [missed, setMissed] = useState([]); // id کلماتی که حداقل یک‌بار غلط جواب داده شده‌اند
    const [confirmOpen, setConfirmOpen] = useState(false);
    const timer = useRef(null);

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
        },
        []
    );

    // پخش خودکار کلمه در سؤال‌های «انگلیسی به فارسی» (به‌جز اولین سؤال هنگام باز شدن صفحه)
    useEffect(() => {
        if (skipFirstSpeech.current) {
            skipFirstSpeech.current = false;
            return;
        }
        if (!autoSpeakRef.current) return;
        const item = queue[0];
        if (item && item.type === 'en2fa') speak(item.word.en);
    }, [queue]);

    if ((!source && !isDeckQuiz) || words.length === 0) {
        return (
            <SafeAreaView style={styles.screen} edges={['top']}>
                <ScreenHeader title="آزمون" />
                <View style={styles.center}>
                    <Text style={styles.empty}>کلمه‌ای برای این منبع پیدا نشد</Text>
                </View>
            </SafeAreaView>
        );
    }

    const total = words.length * DIRECTIONS.length;
    const finished = queue.length === 0;
    const unadded = words.filter((w) => !progress[w.id]);

    const restart = () => {
        setQueue(buildQueue(words, pool));
        setCorrect(0);
        setSelected(null);
        setMissed([]);
    };

    const choose = (opt) => {
        if (selected !== null) return;
        const current = queue[0];
        const isCorrect = opt.id === current.word.id;
        setSelected(opt.id);

        // در سؤال «فارسی به انگلیسی»، بعد از جواب تلفظ کلمه درست را می‌شنوند
        if (autoSpeak && current.type === 'fa2en') speak(current.word.en);

        timer.current = setTimeout(() => {
            const rest = queue.slice(1);
            if (isCorrect) {
                setCorrect((c) => c + 1);
            } else {
                rest.push(makeItem(current.word, current.type, pool)); // دوباره بعداً می‌پرسیم
                setMissed((m) => (m.includes(current.word.id) ? m : [...m, current.word.id]));
            }
            setSelected(null);
            setQueue(rest);
        }, isCorrect ? 700 : 1400);
    };

    const confirmLearnedAll = () => {
        addToBox1(unadded.map((w) => w.id));
        setConfirmOpen(false);
    };

    const header = (
        <>
            <ScreenHeader
                title={isDeckQuiz ? 'آزمون دسته' : `آزمون ${source.title}`}
                right={
                    <RoundIconButton
                        icon="rocket-outline"
                        size={44}
                        disabled={unadded.length === 0}
                        onPress={() => setConfirmOpen(true)}
                        accessibilityLabel="همه را یاد گرفتم"
                    />
                }
            />
            <View style={styles.bar}>
                <ProgressBar value={correct / total} />
            </View>
        </>
    );

    const dialog = (
        <LearnedAllDialog
            visible={confirmOpen}
            total={words.length}
            remaining={unadded.length}
            onConfirm={confirmLearnedAll}
            onCancel={() => setConfirmOpen(false)}
        />
    );

    // ---------- جمع‌بندی ----------
    if (finished) {
        const missedWords = words.filter((w) => missed.includes(w.id));
        return (
            <SafeAreaView style={styles.screen} edges={['top']}>
                {header}

                <ScrollView contentContainerStyle={styles.sumContent}>
                    <Text style={styles.emoji}>🎉</Text>
                    <Text style={styles.sumTitle}>آزمون تمام شد</Text>
                    <Text style={styles.sumSub}>
                        {`${words.length - missedWords.length} از ${words.length} کلمه را بار اول درست جواب دادی`}
                    </Text>

                    {missedWords.length > 0 && (
                        <View style={styles.missedBox}>
                            <Text style={styles.missedTitle}>نیاز به تمرین بیشتر</Text>
                            {missedWords.map((w) => (
                                <View key={w.id} style={styles.sumRow}>
                                    <Text style={styles.sumFa}>{w.fa}</Text>
                                    <Text style={styles.sumEn}>{w.en}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <Button title="آزمون دوباره" onPress={restart} />
                    <Button title="بازگشت" variant="ghost" onPress={() => router.back()} />
                </View>

                {dialog}
            </SafeAreaView>
        );
    }

    // ---------- سؤال ----------
    const current = queue[0];
    const isEn2Fa = current.type === 'en2fa';
    const field = isEn2Fa ? 'fa' : 'en';

    const stateOf = (opt) => {
        if (selected === null) return 'idle';
        if (opt.id === current.word.id) return 'correct';
        if (opt.id === selected) return 'wrong';
        return 'dim';
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            {header}

            <FadeIn key={current.id} style={styles.quizArea}>
                <Text style={styles.question}>
                    {isEn2Fa ? 'معنی این کلمه چیست؟' : 'این معنی کدام کلمه است؟'}
                </Text>
                <Text style={[styles.prompt, !isEn2Fa && styles.promptFa]}>
                    {isEn2Fa ? current.word.en : current.word.fa}
                </Text>
                {isEn2Fa && <SpeakButton text={current.word.en} style={styles.speak} />}

                <View style={styles.options}>
                    {current.options.map((opt) => {
                        const st = stateOf(opt);
                        return (
                            <Pressable
                                key={opt.id}
                                onPress={() => choose(opt)}
                                style={[
                                    styles.option,
                                    st === 'correct' && styles.optCorrect,
                                    st === 'wrong' && styles.optWrong,
                                    st === 'dim' && styles.optDim,
                                ]}
                            >
                                <Text style={[styles.optionText, !isEn2Fa && styles.optionTextEn]}>
                                    {opt[field]}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </FadeIn>

            {dialog}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { fontSize: 16, color: colors.sub },
    bar: { paddingHorizontal: 24, marginTop: 4 },

    quizArea: { flex: 1, padding: 20 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 24 },
    prompt: { fontSize: 40, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 12, marginBottom: 16 },
    promptFa: { fontSize: 32 },
    speak: { alignSelf: 'center', marginTop: 12 },
    options: { gap: 12, marginTop: 16 },
    option: {
        backgroundColor: colors.card,
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionText: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center' },
    optionTextEn: { fontSize: 22 },
    optCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    optWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    optDim: { opacity: 0.45 },

    sumContent: { padding: 20, alignItems: 'center' },
    emoji: { fontSize: 56, marginTop: 20 },
    sumTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center' },
    sumSub: { fontSize: 15, color: colors.sub, marginTop: 6, textAlign: 'center' },
    missedBox: { alignSelf: 'stretch', marginTop: 28, gap: 10 },
    missedTitle: { fontSize: 14, fontWeight: '700', color: colors.sub, textAlign: 'center', marginBottom: 2 },
    sumRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
    },
    sumEn: { fontSize: 18, fontWeight: '700', color: colors.text },
    sumFa: { fontSize: 16, color: colors.sub },
    footer: { padding: 20, paddingTop: 8, gap: 4 },
});