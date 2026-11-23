import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import SwipeCards, { findNext } from './SwipeCards';
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
 * هر کلمه یک کارت است؛ کشیدن به چپ = بعدی، کشیدن به راست = قبلی.
 * جواب غلط به کلمه بعد نمی‌رود؛ می‌توان گزینه دیگری را امتحان کرد.
 * words: کلمات دسته | pool: همه کلمات کاتالوگ (برای گزینه‌های غلط)
 */
export default function MultipleChoiceModule({ words, pool = [], onNext, onPrev, onRestart, onComplete }) {
    const { autoSpeak } = useSettings();
    const [items] = useState(() => shuffle(words).map((w) => makeItem(w, words, pool)));
    const [index, setIndex] = useState(0);
    const [solved, setSolved] = useState(() => new Set()); // id کلمه‌های درست‌جواب‌داده‌شده
    const [missed, setMissed] = useState([]); // id کلماتی که حداقل یک‌بار غلط جواب داده شده‌اند
    const [wrongOpt, setWrongOpt] = useState(null); // گزینه غلطِ انتخاب‌شده (چند لحظه نمایش داده می‌شود)
    const hasMoved = useRef(false); // تا اولین تغییر کارت، تلفظ خودکار نداریم
    const [finished, setFinished] = useState(false);
    const timer = useRef(null);
    const cards = useRef(null);

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
        },
        []
    );

    useEffect(() => {
        if (finished) onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finished]);

    // تلفظ خودکار کلمه هر کارت (به‌جز کارت اول هنگام ورود به صفحه)
    const currentId = items[index]?.id;
    useEffect(() => {
        if (hasMoved.current && autoSpeak && items[index]) speak(items[index].word.en);
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

    const current = items[index];
    const wid = current.word.id;
    const isSolved = solved.has(wid);

    // رفتن به کارت دیگر (با کشیدن، نقطه‌ها یا خودکار)
    const go = (i) => {
        clearTimeout(timer.current);
        timer.current = null;
        hasMoved.current = true;
        setWrongOpt(null);
        setIndex(i);
    };

    const choose = (opt) => {
        if (isSolved || timer.current) return;

        if (opt.id === wid) {
            const nextSolved = new Set(solved).add(wid);
            setSolved(nextSolved);
            // بعد از جواب درست، به کارت تمام‌نشده بعدی می‌رود
            timer.current = setTimeout(() => {
                timer.current = null;
                if (nextSolved.size === items.length) {
                    setFinished(true);
                    return;
                }
                const n = findNext(items.length, index, (i) => nextSolved.has(items[i].word.id));
                if (n >= 0) cards.current?.goTo(n);
            }, 700);
        } else {
            // جواب غلط: روی همین کارت می‌ماند و بعد از چند لحظه گزینه از حالت انتخاب درمی‌آید
            setWrongOpt(opt.id);
            setMissed((m) => (m.includes(wid) ? m : [...m, wid]));
            timer.current = setTimeout(() => {
                timer.current = null;
                setWrongOpt(null);
            }, 900);
        }
    };

    const stateOf = (opt) => {
        if (isSolved) return opt.id === wid ? 'correct' : 'dim';
        if (wrongOpt === opt.id) return 'wrong';
        return 'idle';
    };

    return (
        <ScrollView contentContainerStyle={styles.root}>
            <SwipeCards ref={cards} count={items.length} index={index} onChange={go}>
                <Text style={styles.question}>معنی این کلمه چیست؟</Text>
                <View style={styles.promptRow}>
                    <Text
                        onPress={() => speak(current.word.en)}
                        accessibilityRole="button"
                        accessibilityLabel={`پخش تلفظ ${current.word.en}`}
                        style={styles.prompt}
                    >
                        {current.word.en}
                    </Text>
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
                                {st === 'correct' && (
                                    <Ionicons name="checkmark-circle" size={32} color={colors.success} style={styles.mark} />
                                )}
                                {st === 'wrong' && (
                                    <Ionicons name="close-circle" size={32} color={colors.danger} style={styles.mark} />
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            </SwipeCards>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center' },
    promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
    prompt: { fontSize: 38, fontWeight: '800', color: colors.text, textAlign: 'center', flexShrink: 1 },
    options: { gap: 8, marginTop: 8 },
    option: {
        backgroundColor: colors.bg,
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    mark: { position: 'absolute', left: 14, top: '50%' },
    optionText: { fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center' },
    optCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    optWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    optDim: { opacity: 0.45 },
});