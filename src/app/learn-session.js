import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { WORDS } from '../data/words';
import { useProgress } from '../context/ProgressContext';
import { getNewWords, startEntry, shuffle, LEARN_BATCH_SIZE } from '../leitner';
import { colors } from '../theme';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import FadeIn from '../components/FadeIn';

// ساخت یک سؤال: type = 'en2fa' یا 'fa2en'
function makeItem(word, type) {
    const field = type === 'en2fa' ? 'fa' : 'en';
    const others = shuffle(
        WORDS.filter((w) => w.id !== word.id && w[field] !== word[field])
    ).slice(0, 3);
    return {
        id: Math.random().toString(36).slice(2),
        word,
        type,
        options: shuffle([word, ...others]),
    };
}

export default function LearnSession() {
    const router = useRouter();
    const { getProgress, setEntry } = useProgress();

    const pickBatch = () => getNewWords(WORDS, getProgress()).slice(0, LEARN_BATCH_SIZE);

    const [phase, setPhase] = useState('intro'); // intro | quiz | summary
    const [words, setWords] = useState(pickBatch);
    const [idx, setIdx] = useState(0);
    const [knownCount, setKnownCount] = useState(0);

    const [queue, setQueue] = useState([]);
    const [quizTotal, setQuizTotal] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [selected, setSelected] = useState(null);
    const timer = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    const startBatch = () => {
        setWords(pickBatch());
        setIdx(0);
        setKnownCount(0);
        setQueue([]);
        setCorrectCount(0);
        setSelected(null);
        setPhase('intro');
    };

    const beginQuiz = (list) => {
        const q = [
            ...shuffle(list).map((w) => makeItem(w, 'en2fa')),
            ...shuffle(list).map((w) => makeItem(w, 'fa2en')),
        ];
        setQueue(q);
        setQuizTotal(q.length);
        setCorrectCount(0);
        setSelected(null);
        setPhase('quiz');
    };

    const finishQuiz = () => {
        words.forEach((w) => setEntry(w.id, startEntry()));
        setPhase('summary');
    };

    // ---------- مرحله معرفی ----------
    const next = () => {
        if (idx + 1 < words.length) setIdx(idx + 1);
        else beginQuiz(words);
    };

    const alreadyKnown = () => {
        const w = words[idx];
        setEntry(w.id, startEntry()); // مستقیم به جعبه ۱
        setKnownCount((c) => c + 1);

        const rest = words.filter((x) => x.id !== w.id);
        setWords(rest);

        if (rest.length === 0) setPhase('summary');
        else if (idx >= rest.length) beginQuiz(rest);
        // در غیر این صورت idx حالا به کلمه بعدی اشاره می‌کند
    };

    // ---------- مرحله آزمون ----------
    const choose = (opt) => {
        if (selected !== null) return;
        const current = queue[0];
        const correct = opt.id === current.word.id;
        setSelected(opt.id);

        timer.current = setTimeout(() => {
            const rest = queue.slice(1);
            if (correct) setCorrectCount((c) => c + 1);
            else rest.push(makeItem(current.word, current.type)); // دوباره بعداً می‌پرسیم
            setSelected(null);
            setQueue(rest);
            if (rest.length === 0) finishQuiz();
        }, correct ? 700 : 1400);
    };

    // ---------- نمایش ----------
    const header = (value, label) => (
        <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
                <Ionicons name="close" size={28} color={colors.sub} />
            </Pressable>
            <View style={styles.barWrap}>
                <ProgressBar value={value} />
            </View>
            <Text style={styles.headerLabel}>{label}</Text>
        </View>
    );

    // هیچ کلمه جدیدی نمانده
    if (words.length === 0 && phase === 'intro') {
        return (
            <SafeAreaView style={styles.centerScreen}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.sumTitle}>همه کلمات را یاد گرفتی</Text>
                <Button title="بازگشت" onPress={() => router.back()} style={styles.fullBtn} />
            </SafeAreaView>
        );
    }

    if (phase === 'intro') {
        const w = words[idx];
        const isLast = idx === words.length - 1;
        return (
            <SafeAreaView style={styles.screen}>
                {header(idx / words.length, `${idx + 1}/${words.length}`)}

                <View style={styles.content}>
                    <FadeIn key={w.id} style={styles.card}>
                        <View style={styles.chip}>
                            <Text style={styles.chipText}>کلمه جدید</Text>
                        </View>
                        <Text style={styles.en}>{w.en}</Text>
                        <Text style={styles.fa}>{w.fa}</Text>

                        {w.example ? (
                            <View style={styles.exampleBox}>
                                <Text style={styles.exampleEn}>{w.example}</Text>
                                {w.exampleFa ? <Text style={styles.exampleFa}>{w.exampleFa}</Text> : null}
                            </View>
                        ) : null}
                    </FadeIn>
                </View>

                <View style={styles.footer}>
                    <Button title={isLast ? 'شروع آزمون' : 'بعدی'} onPress={next} />
                    <Button title="این را از قبل بلدم" variant="ghost" onPress={alreadyKnown} />
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'quiz') {
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
            <SafeAreaView style={styles.screen}>
                {header(correctCount / quizTotal, 'آزمون')}

                <FadeIn key={current.id} style={styles.quizArea}>
                    <Text style={styles.question}>
                        {isEn2Fa ? 'معنی این کلمه چیست؟' : 'این معنی کدام کلمه است؟'}
                    </Text>
                    <Text style={[styles.prompt, !isEn2Fa && styles.promptFa]}>
                        {isEn2Fa ? current.word.en : current.word.fa}
                    </Text>

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
            </SafeAreaView>
        );
    }

    // ---------- جمع‌بندی ----------
    const remaining = getNewWords(WORDS, getProgress()).length;
    const learnedTotal = words.length + knownCount;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.sumHeader}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.sumTitle}>{learnedTotal} کلمه جدید اضافه شد</Text>
                <Text style={styles.sub}>از فردا در بخش مرور می‌بینی‌شان</Text>
            </View>

            <ScrollView contentContainerStyle={styles.sumList}>
                {words.map((w) => (
                    <View key={w.id} style={styles.sumRow}>
                        <Text style={styles.sumFa}>{w.fa}</Text>
                        <Text style={styles.sumEn}>{w.en}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                {remaining > 0 && <Button title="کلمات بعدی" onPress={startBatch} />}
                <Button
                    title="تمام"
                    variant={remaining > 0 ? 'ghost' : 'primary'}
                    onPress={() => router.back()}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    centerScreen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
    fullBtn: { alignSelf: 'stretch', marginTop: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 },
    barWrap: { flex: 1 },
    headerLabel: { fontSize: 14, color: colors.sub, minWidth: 40, textAlign: 'right' },

    content: { flex: 1, padding: 20, justifyContent: 'center' },
    card: {
        backgroundColor: colors.card,
        borderRadius: 28,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    chip: { backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
    chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    en: { fontSize: 42, fontWeight: '800', color: colors.text, marginTop: 20 },
    fa: { fontSize: 28, fontWeight: '600', color: colors.primary, marginTop: 10, textAlign: 'center' },
    exampleBox: {
        alignSelf: 'stretch',
        backgroundColor: colors.bg,
        borderRadius: 16,
        padding: 16,
        marginTop: 24,
        gap: 8,
    },
    exampleEn: { fontSize: 17, color: colors.text, textAlign: 'left', lineHeight: 24 },
    exampleFa: { fontSize: 15, color: colors.sub, textAlign: 'right', writingDirection: 'rtl', lineHeight: 22 },

    footer: { padding: 20, gap: 4 },

    quizArea: { flex: 1, padding: 20 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 24 },
    prompt: { fontSize: 40, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 12, marginBottom: 32 },
    promptFa: { fontSize: 32 },
    options: { gap: 12 },
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

    emoji: { fontSize: 56 },
    sumHeader: { alignItems: 'center', marginTop: 40, marginBottom: 12 },
    sumTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 15, color: colors.sub, marginTop: 6 },
    sumList: { padding: 20, gap: 10 },
    sumRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
    },
    sumEn: { fontSize: 18, fontWeight: '700', color: colors.text },
    sumFa: { fontSize: 16, color: colors.sub },
});