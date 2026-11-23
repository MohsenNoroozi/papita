import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import Button from '@/components/Button';
import StepResult from './StepResult';
import SwipeCards from './SwipeCards';
import { ModuleEmpty } from './shared';

// شناسه هر مهره = اندیس حرف در کلمه اصلی (بدون فاصله)
function makeItem(word) {
    const letters = word.en.replace(/\s+/g, '').split('');
    const order = letters.map((ch, id) => ({ id, ch }));
    let tiles = shuffle(order);
    for (let t = 0; t < 5 && new Set(letters).size > 1 && tiles.every((x, i) => x.ch === order[i].ch); t++) {
        tiles = shuffle(order);
    }
    return { id: Math.random().toString(36).slice(2), word, letters, tiles };
}

/**
 * قدم «تثبیت» (کلمات درهم): حروف را به ترتیب درست بچین
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
    const [placed, setPlaced] = useState([]); // شناسه مهره‌ها به ترتیب قرارگیری
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
    const isSolved = !!current && solved.has(wid);
    const idle = !!current && status === 'idle' && !isSolved;

    const markMissed = () => setMissed((m) => (m.includes(wid) ? m : [...m, wid]));

    const place = (id) => {
        if (!idle || placed.length >= current.letters.length || placed.includes(id)) return;
        const next = [...placed, id];
        setPlaced(next);
        if (next.length < current.letters.length) return;

        const guess = next.map((i) => current.letters[i]).join('').toLowerCase();
        if (guess === current.letters.join('').toLowerCase()) {
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

    const unplace = (k) => {
        if (!idle) return;
        setPlaced(placed.filter((_, i) => i !== k));
    };

    // نمایش پاسخ؛ بعد از آن کارت پاک می‌شود و هنوز حل‌نشده است
    const reveal = () => {
        if (!idle) return;
        setPlaced(current.letters.map((_, i) => i)); // ترتیب اصلی = اندیس‌ها
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
        const shownPlaced = isSolved ? current.letters.map((_, i) => i) : placed;
        const shownStatus = isSolved ? 'correct' : status;

        // خانه‌های پاسخ (فاصله بین کلمات چندبخشی مثل "ice pop" حفظ می‌شود)
        let k = -1;
        const slots = current.word.en.split('').map((ch, i) => {
            if (ch === ' ') return <View key={`gap${i}`} style={styles.gap} />;
            k += 1;
            const pos = k;
            const id = shownPlaced[pos];
            return (
                <Pressable
                    key={`slot${i}`}
                    onPress={() => unplace(pos)}
                    style={[
                        styles.slot,
                        id != null && styles.slotFilled,
                        (shownStatus === 'correct' || shownStatus === 'revealed') && styles.slotCorrect,
                        shownStatus === 'wrong' && styles.slotWrong,
                    ]}
                >
                    <Text style={styles.slotText}>{id != null ? current.letters[id] : ''}</Text>
                </Pressable>
            );
        });

        content = (
            <>
                <Text style={styles.question}>حروف را به ترتیب بچین</Text>

                <Pressable
                    onPress={() => speak(current.word.en)}
                    accessibilityRole="button"
                    accessibilityLabel="پخش تلفظ"
                    style={styles.faBox}
                >
                    <Text style={styles.fa}>{current.word.fa}</Text>
                </Pressable>

                <View style={styles.slotsRow}>{slots}</View>

                <View style={styles.tilesRow}>
                    {current.tiles.map((t) => {
                        const used = shownPlaced.includes(t.id);
                        return (
                            <Pressable
                                key={t.id}
                                onPress={() => place(t.id)}
                                disabled={used}
                                style={[styles.tile, used && styles.tileUsed]}
                            >
                                <Text style={styles.tileText}>{t.ch}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.actions}>
                    <Button
                        title="پاک کردن"
                        variant="soft"
                        disabled={placed.length === 0 || !idle}
                        onPress={() => setPlaced([])}
                    />
                    <Button title="نمایش پاسخ" variant="ghost" disabled={!idle} onPress={reveal} />
                </View>
            </>
        );
    }

    return (
        <View style={styles.flex}>
            <ScrollView style={styles.flex} contentContainerStyle={styles.root}>
                <SwipeCards ref={cards} count={total + 1} dotCount={total} index={index} onChange={go}>
                    {content}
                </SwipeCards>
            </ScrollView>
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
    slotCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    slotWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    slotText: { fontSize: 20, fontWeight: '800', color: colors.text },
    tilesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        direction: 'ltr',
        marginTop: 8,
    },
    tile: {
        width: 46,
        height: 54,
        borderRadius: 14,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileUsed: { opacity: 0 },
    tileText: { fontSize: 26, fontWeight: '800', color: colors.primary },
    actions: { gap: 4, marginTop: 8 },
});