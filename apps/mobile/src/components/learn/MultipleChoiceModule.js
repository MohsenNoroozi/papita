import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import StepResult from './StepResult';
import SwipeCards from './SwipeCards';
import { ModuleEmpty } from './shared';

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
 * قدم «یادآوری» (۴ گزینه‌ای): معنی فارسی کلمه را انتخاب کن
 * هر کلمه یک کارت است + یک صفحه پایانی؛ کشیدن به راست = بعدی، کشیدن به چپ = قبلی.
 * جواب غلط به کلمه بعد نمی‌رود؛ می‌توان گزینه دیگری را امتحان کرد.
 * words: کلمات دسته | pool: همه کلمات کاتالوگ (برای گزینه‌های غلط)
 * saved / onSave: ذخیره پیشرفت تا با رفتن به مرحله دیگر از بین نرود
 */
export default function MultipleChoiceModule({words, pool = [], saved, onSave, onComplete}) {
    const { autoSpeak } = useSettings();
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const [items] = useState(() => saved?.items ?? shuffle(words).map((w) => makeItem(w, words, pool)));
    const [solved, setSolved] = useState(() => new Set(saved?.solved ?? [])); // id کلمه‌های درست‌جواب‌داده‌شده
    const [missed, setMissed] = useState(() => saved?.missed ?? []); // id کلماتی که حداقل یک‌بار غلط جواب داده شده‌اند
    const last = useRef(saved?.last ?? -1); // اندیس آخرین کارتی که درست جواب داده شد
    // بازگشت: یک کارت بعد از آخرین جواب درست (یا صفحه پایانی)
    const [index, setIndex] = useState(() => Math.min(last.current + 1, items.length));
    const [wrongOpt, setWrongOpt] = useState(null); // گزینه غلطِ انتخاب‌شده (چند لحظه نمایش داده می‌شود)
    const hasMoved = useRef(false); // تا اولین تغییر کارت، تلفظ خودکار نداریم
    const timer = useRef(null);
    const cards = useRef(null);

    const total = items.length;
    const complete = total > 0 && solved.size === total;
    const isResult = total > 0 && index >= total;

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
        },
        []
    );

    useEffect(() => {
        onSaveRef.current?.({ items, solved: [...solved], missed, last: last.current });
    }, [items, solved, missed]);

    useEffect(() => {
        if (complete) onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complete]);

    // تلفظ خودکار کلمه هر کارت (به‌جز کارت اول هنگام ورود به صفحه)
    const currentId = items[index]?.id;
    useEffect(() => {
        if (hasMoved.current && autoSpeak && items[index]) speak(items[index].word.en);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentId]);

    if (words.length === 0) return <ModuleEmpty />;

    // رفتن به کارت دیگر (با کشیدن، نقطه‌ها یا خودکار)
    const go = (i) => {
        clearTimeout(timer.current);
        timer.current = null;
        hasMoved.current = true;
        setWrongOpt(null);
        setIndex(i);
    };

    const current = isResult ? null : items[index];

    const choose = (opt) => {
        if (!current || solved.has(current.word.id) || timer.current) return;
        const wid = current.word.id;

        if (opt.id === wid) {
            const nextSolved = new Set(solved).add(wid);
            last.current = index;
            setSolved(nextSolved);
            // بعد از جواب درست: کارت بعدی (یا صفحه پایانی اگر همه حل شده‌اند)
            timer.current = setTimeout(() => {
                timer.current = null;
                cards.current?.goTo(nextSolved.size === total ? total : index + 1);
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
        if (solved.has(current.word.id)) return opt.id === current.word.id ? 'correct' : 'dim';
        if (wrongOpt === opt.id) return 'wrong';
        return 'idle';
    };

    const firstTry = items.filter((it) => solved.has(it.word.id) && !missed.includes(it.word.id)).length;
    const resultLines = [];
    if (solved.size === total) {
        resultLines.push('همه کلمات را درست جواب دادی');
    } else {
        resultLines.push(`${solved.size} از ${total} کلمه را درست جواب دادی`);
    }
    if (firstTry === total) {
        resultLines.length = 0;
        resultLines.push('همه کلمات را بار اول درست جواب دادی');
    } else if (firstTry > 0) {
        resultLines.push(`${firstTry} از ${total} کلمه را بار اول درست جواب دادی`);
    }

    return (
        <View style={styles.flex}>
            <ScrollView style={styles.flex} contentContainerStyle={styles.root}>
                <SwipeCards ref={cards} count={total + 1} dotCount={total} index={index} onChange={go}>
                    {isResult ? (
                        <StepResult
                            complete={complete}
                            lines={resultLines}
                        />
                    ) : (
                        <>
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
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={32}
                                                    color={colors.success}
                                                    style={styles.mark}
                                                />
                                            )}
                                            {st === 'wrong' && (
                                                <Ionicons
                                                    name="close-circle"
                                                    size={32}
                                                    color={colors.danger}
                                                    style={styles.mark}
                                                />
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </SwipeCards>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    root: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center' },
    promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
    prompt: { fontSize: 38, fontWeight: '800', color: colors.text, textAlign: 'center', flexShrink: 1 },
    options: { gap: 4 },
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
