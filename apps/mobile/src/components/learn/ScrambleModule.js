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

// ردیف‌های کیبورد (QWERTY)
const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const isLetter = (ch) => /[a-z]/i.test(ch);
// حروف قابل‌تایپ کلمه (بدون فاصله و کاراکترهای خاص مثل , ? . ' -)، حروف کوچک
const lettersOf = (en) => en.toLowerCase().split('').filter(isLetter);

const makeItem = (word) => ({ id: Math.random().toString(36).slice(2), word });

/**
 * قدم «تثبیت» (کلمات درهم): حروف را با کیبورد به ترتیب درست بزن
 * - کیبورد بیرون از کارت و تمام‌عرض است؛ فقط حروف کلمه فعال‌اند (هر حرف تا به تعدادی که در کلمه هست)
 * - کاراکترهای خاص (, ? . ' - ...) از قبل در خانه‌ها پر هستند و تایپ نمی‌شوند
 * هر کلمه یک کارت است + یک صفحه پایانی؛ کشیدن به راست = بعدی، کشیدن به چپ = قبلی.
 * saved / onSave: ذخیره پیشرفت تا با رفتن به مرحله دیگر از بین نرود
 */
export default function ScrambleModule({ words, saved, onSave, onComplete }) {
    const { autoSpeak } = useSettings();
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const [items] = useState(() => saved?.items ?? shuffle(words).map(makeItem));
    const [solved, setSolved] = useState(() => new Set(saved?.solved ?? []));
    const [missed, setMissed] = useState(() => saved?.missed ?? []);
    const last = useRef(saved?.last ?? -1); // اندیس آخرین کارت حل‌شده
    // بازگشت: یک کارت بعد از آخرین جواب درست (یا صفحه پایانی)
    const [index, setIndex] = useState(() => Math.min(last.current + 1, items.length));
    const [placed, setPlaced] = useState([]); // حروفی که تا الان زده شده (به ترتیب)
    const [status, setStatus] = useState('idle'); // idle | correct | wrong | revealed
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

    if (words.length === 0) return <ModuleEmpty />;

    // رفتن به کارت دیگر: وضعیت کارت قبلی پاک می‌شود
    const go = (i) => {
        clearTimeout(timer.current);
        timer.current = null;
        setPlaced([]);
        setStatus('idle');
        setIndex(i);
    };

    const current = isResult ? null : items[index];
    const wid = current?.word.id;
    const letters = current ? lettersOf(current.word.en) : [];
    const isSolved = !!current && solved.has(wid);
    const idle = !!current && status === 'idle' && !isSolved;

    const markMissed = () => setMissed((m) => (m.includes(wid) ? m : [...m, wid]));

    // تعداد باقی‌مانده‌ی هر حرف (حروف کلمه منهای حروف زده‌شده)
    const remaining = {};
    for (const ch of letters) remaining[ch] = (remaining[ch] ?? 0) + 1;
    for (const ch of placed) remaining[ch] -= 1;

    const place = (ch) => {
        if (!idle || placed.length >= letters.length || (remaining[ch] ?? 0) <= 0) return;
        const next = [...placed, ch];
        setPlaced(next);
        if (next.length < letters.length) return;

        if (next.join('') === letters.join('')) {
            const nextSolved = new Set(solved).add(wid);
            last.current = index;
            setSolved(nextSolved);
            setStatus('correct');
            if (autoSpeak) speak(current.word.en);
            timer.current = setTimeout(() => {
                timer.current = null;
                cards.current?.goTo(nextSolved.size === total ? total : index + 1);
            }, 900);
        } else {
            setStatus('wrong');
            markMissed();
            timer.current = setTimeout(() => {
                timer.current = null;
                setPlaced([]);
                setStatus('idle');
            }, 900);
        }
    };

    // پاک کردن آخرین حرف
    const backspace = () => {
        if (!idle || placed.length === 0) return;
        setPlaced(placed.slice(0, -1));
    };

    // پاک کردن همه حروف زده‌شده
    const clearAll = () => {
        if (!idle || placed.length === 0) return;
        setPlaced([]);
    };

    // لمس یک خانه = برداشتن همان حرف
    const unplace = (k) => {
        if (!idle) return;
        setPlaced(placed.filter((_, i) => i !== k));
    };

    // نمایش پاسخ؛ بعد از آن کارت پاک می‌شود و هنوز حل‌نشده است
    const reveal = () => {
        if (!idle) return;
        setPlaced([...letters]);
        setStatus('revealed');
        markMissed();
        timer.current = setTimeout(() => {
            timer.current = null;
            setPlaced([]);
            setStatus('idle');
        }, 1400);
    };

    const firstTry = items.filter((it) => solved.has(it.word.id) && !missed.includes(it.word.id)).length;
    const unsolvedWords = items.filter((it) => !solved.has(it.word.id)).map((it) => it.word);
    const missedWords = items.filter((it) => missed.includes(it.word.id)).map((it) => it.word);

    let content;
    let keyboard = null;
    if (isResult) {
        content = (
            <StepResult
                complete={complete}
                lines={[
                    `${solved.size} از ${total} کلمه را درست چیدی`,
                    `${firstTry} از ${total} کلمه را بار اول درست چیدی`,
                ]}
                sections={[
                    { title: 'هنوز درست نچیده‌ای', words: unsolvedWords },
                    { title: 'نیاز به تمرین بیشتر', words: missedWords },
                ]}
            />
        );
    } else {
        // کارت حل‌شده با رفت‌وبرگشت، پاسخ درست را نشان می‌دهد
        const shownPlaced = isSolved ? letters : placed;
        const shownStatus = isSolved ? 'correct' : status;
        const allGreen = shownStatus === 'correct' || shownStatus === 'revealed';

        // خانه‌های پاسخ: فاصله بین کلمات حفظ می‌شود و کاراکترهای خاص از قبل پر هستند
        let k = -1;
        const slots = current.word.en.split('').map((ch, i) => {
            if (ch === ' ') return <View key={`gap${i}`} style={styles.gap} />;

            if (!isLetter(ch)) {
                return (
                    <View key={`fix${i}`} style={[styles.slot, styles.slotFixed, allGreen && styles.slotCorrect]}>
                        <Text style={[styles.slotText, styles.slotTextFixed]}>{ch}</Text>
                    </View>
                );
            }

            k += 1;
            const pos = k;
            const letter = shownPlaced[pos];
            return (
                <Pressable
                    key={`slot${i}`}
                    onPress={() => unplace(pos)}
                    style={[
                        styles.slot,
                        letter != null && styles.slotFilled,
                        allGreen && styles.slotCorrect,
                        shownStatus === 'wrong' && styles.slotWrong,
                    ]}
                >
                    <Text style={styles.slotText}>{letter ?? ''}</Text>
                </Pressable>
            );
        });

        content = (
            <>
                <Text style={styles.question}>حروف را به ترتیب بزن</Text>

                <Pressable
                    onPress={() => speak(current.word.en)}
                    accessibilityRole="button"
                    accessibilityLabel="پخش تلفظ"
                    style={styles.faBox}
                >
                    <Text style={styles.fa}>{current.word.fa}</Text>
                </Pressable>

                <View style={styles.slotsRow}>{slots}</View>
            </>
        );

        const canType = idle && placed.length < letters.length;
        const canErase = idle && placed.length > 0;

        // کیبورد: بیرون از کارت، تمام‌عرض؛ فقط حروف کلمه فعال‌اند
        keyboard = (
            <View style={styles.keyboard}>
                {KEY_ROWS.map((row, r) => (
                    <View key={row} style={styles.keyRow}>
                        {row.split('').map((ch) => {
                            const enabled = canType && (remaining[ch] ?? 0) > 0;
                            const inWord = ch in remaining;
                            return (
                                <Pressable
                                    key={ch}
                                    onPress={() => place(ch)}
                                    disabled={!enabled}
                                    accessibilityRole="button"
                                    accessibilityLabel={ch}
                                    style={({ pressed }) => [
                                        styles.key,
                                        enabled ? styles.keyOn : styles.keyOff,
                                        enabled && pressed && styles.keyPressed,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.keyText,
                                            enabled ? styles.keyTextOn : styles.keyTextOff,
                                            !inWord && styles.keyTextNotInWord,
                                        ]}
                                    >
                                        {ch}
                                    </Text>
                                </Pressable>
                            );
                        })}
                        {r === KEY_ROWS.length - 1 && (
                            <Pressable
                                onPress={backspace}
                                disabled={!canErase}
                                accessibilityRole="button"
                                accessibilityLabel="پاک کردن حرف"
                                style={({ pressed }) => [
                                    styles.key,
                                    styles.keyWide,
                                    canErase ? styles.keyDanger : styles.keyOff,
                                    canErase && pressed && styles.keyPressed,
                                ]}
                            >
                                <Ionicons
                                    name="backspace-outline"
                                    size={24}
                                    color={canErase ? colors.danger : colors.starEmpty}
                                />
                            </Pressable>
                        )}
                    </View>
                ))}

                {/* ردیف آخر: نمایش پاسخ (چشم) و پاک کردن همه (ضربدر) */}
                <View style={styles.keyRow}>
                    <Pressable
                        onPress={reveal}
                        disabled={!idle}
                        accessibilityRole="button"
                        accessibilityLabel="نمایش پاسخ"
                        style={({ pressed }) => [
                            styles.key,
                            idle ? styles.keyOn : styles.keyOff,
                            idle && pressed && styles.keyPressed,
                        ]}
                    >
                        <Ionicons name="eye-outline" size={26} color={idle ? colors.primary : colors.starEmpty} />
                    </Pressable>
                    <Pressable
                        onPress={clearAll}
                        disabled={!canErase}
                        accessibilityRole="button"
                        accessibilityLabel="پاک کردن همه"
                        style={({ pressed }) => [
                            styles.key,
                            canErase ? styles.keyDanger : styles.keyOff,
                            canErase && pressed && styles.keyPressed,
                        ]}
                    >
                        <Ionicons name="close" size={26} color={canErase ? colors.danger : colors.starEmpty} />
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.flex}>
            <ScrollView style={styles.flex} contentContainerStyle={styles.root}>
                <SwipeCards ref={cards} count={total + 1} dotCount={total} index={index} onChange={go}>
                    {content}
                </SwipeCards>
            </ScrollView>
            {keyboard}
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    root: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 4 },
    faBox: { backgroundColor: colors.bg, borderRadius: 18, paddingVertical: 22, paddingHorizontal: 16 },
    fa: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
    slotsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        direction: 'ltr',
        marginTop: 4,
    },
    gap: { width: 4 },
    slot: {
        width: 32,
        height: 36,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotFilled: { borderColor: colors.primary },
    // کاراکتر خاص (از قبل پر): باریک‌تر و کم‌رنگ‌تر
    slotFixed: { width: 24, backgroundColor: colors.border, borderColor: colors.border },
    slotCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    slotWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    slotText: { fontSize: 20, fontWeight: '800', color: colors.text },
    slotTextFixed: { color: colors.sub },

    // کیبورد تمام‌عرض (بیرون از کارت)
    keyboard: {
        gap: 6,
        direction: 'ltr',
        paddingHorizontal: 4,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: colors.card,
        borderTopWidth: StyleSheet.hairlineWidth * 2,
        borderTopColor: colors.border,
    },
    keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 4, direction: 'ltr' },
    key: {
        flex: 1,
        height: 46,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyWide: { flex: 1.6 },
    keyOn: { backgroundColor: colors.primarySoft },
    keyOff: { backgroundColor: colors.bg },
    keyDanger: { backgroundColor: colors.dangerSoft },
    keyPressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
    keyText: { fontSize: 20, fontWeight: '800' },
    keyTextOn: { color: colors.primary },
    keyTextOff: { color: colors.sub },
    keyTextNotInWord: { color: colors.starEmpty },
});