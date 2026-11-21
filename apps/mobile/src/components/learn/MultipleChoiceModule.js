import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import FadeIn from '@/components/FadeIn';
import ProgressBar from '@/components/ProgressBar';
import SpeakButton from '@/components/SpeakButton';
import { ModuleDone, ModuleEmpty } from './shared';

// گزینه‌های غلط: اول از کلمات همین دسته، بعد از pool (کل کاتالوگ)
function makeItem(word, words, pool) {
    const seen = new Set([word.fa]);
    const others = [];
    for (const w of [...shuffle(words), ...shuffle(pool)]) {
        if (others.length >= 3) break;
        if (w.id === word.id || seen.has(w.fa)) continue;
        seen.add(w.fa);
        others.push(w);
    }
    return { id: Math.random().toString(36).slice(2), word, options: shuffle([word, ...others]) };
}

/**
 * قدم «۴ گزینه‌ای»: معنی فارسی کلمه را انتخاب کن
 * words: کلمات دسته | pool: همه کلمات کاتالوگ (برای گزینه‌های غلط)
 */
export default function MultipleChoiceModule({ words, pool = [], onNext, onPrev, onRestart, onComplete }) {
    const { autoSpeak } = useSettings();
    const [queue, setQueue] = useState(() => shuffle(words).map((w) => makeItem(w, words, pool)));
    const [correct, setCorrect] = useState(0);
    const [selected, setSelected] = useState(null);
    const [missed, setMissed] = useState([]);
    const timer = useRef(null);

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
        },
        []
    );

    const finished = words.length > 0 && queue.length === 0;
    useEffect(() => {
        if (finished) onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finished]);

    // تلفظ خودکار کلمه هر سؤال
    const currentId = queue[0]?.id;
    useEffect(() => {
        if (autoSpeak && queue[0]) speak(queue[0].word.en);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentId]);

    if (words.length === 0) return <ModuleEmpty />;

    if (finished) {
        return (
            <ModuleDone
                subtitle={`${words.length - missed.length} از ${words.length} کلمه را بار اول درست جواب دادی`}
                onNext={onNext}
                onPrev={onPrev}
                onRestart={onRestart}
            />
        );
    }

    const current = queue[0];

    const choose = (opt) => {
        if (selected !== null) return;
        const isCorrect = opt.id === current.word.id;
        setSelected(opt.id);
        timer.current = setTimeout(
            () => {
                const rest = queue.slice(1);
                if (isCorrect) {
                    setCorrect((c) => c + 1);
                } else {
                    rest.push(makeItem(current.word, words, pool)); // بعداً دوباره پرسیده می‌شود
                    setMissed((m) => (m.includes(current.word.id) ? m : [...m, current.word.id]));
                }
                setSelected(null);
                setQueue(rest);
            },
            isCorrect ? 700 : 1400
        );
    };

    const stateOf = (opt) => {
        if (selected === null) return 'idle';
        if (opt.id === current.word.id) return 'correct';
        if (opt.id === selected) return 'wrong';
        return 'dim';
    };

    return (
        <ScrollView contentContainerStyle={styles.root}>
            <ProgressBar value={correct / words.length} />
            <FadeIn key={current.id}>
                <Text style={styles.question}>معنی این کلمه چیست؟</Text>
                <View style={styles.promptRow}>
                    <Text style={styles.prompt}>{current.word.en}</Text>
                    <SpeakButton text={current.word.en} size={20} />
                </View>

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
                                <Text style={styles.optionText}>{opt.fa}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </FadeIn>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { padding: 20, gap: 8 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 16 },
    promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 14 },
    prompt: { fontSize: 38, fontWeight: '800', color: colors.text, textAlign: 'center', flexShrink: 1 },
    options: { gap: 12, marginTop: 8 },
    option: {
        backgroundColor: colors.card,
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionText: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center' },
    optCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    optWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    optDim: { opacity: 0.45 },
});