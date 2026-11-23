import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import ProgressBar from '@/components/ProgressBar';
import { ModuleDone, ModuleEmpty } from './shared';

const ROUND_SIZE = 5;

// تقسیم به دورهای ۵تایی؛ اگر آخرین دور فقط یک کلمه شد به دور قبل می‌چسبد
function makeRounds(words) {
    const list = shuffle(words);
    const rounds = [];
    for (let i = 0; i < list.length; i += ROUND_SIZE) rounds.push(list.slice(i, i + ROUND_SIZE));
    if (rounds.length > 1 && rounds[rounds.length - 1].length === 1) {
        rounds[rounds.length - 2].push(...rounds.pop());
    }
    return rounds;
}

/**
 * قدم «تطبیق»: هر کلمه انگلیسی را با معنی فارسی‌اش جفت کن
 * saved / onSave: ذخیره پیشرفت (دورها، جفت‌های درست) تا با رفتن به مرحله دیگر از بین نرود
 */
export default function MatchingModule({ words, saved, onSave, onNext, onPrev, onRestart, onComplete }) {
    const { autoSpeak } = useSettings();
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const [rounds] = useState(() => saved?.rounds ?? makeRounds(words));
    const [roundIdx, setRoundIdx] = useState(saved?.roundIdx ?? 0);
    const [matched, setMatched] = useState(() => new Set(saved?.matched ?? []));
    const [selL, setSelL] = useState(null);
    const [selR, setSelR] = useState(null);
    const [wrong, setWrong] = useState(null); // { l, r }
    const [mistakes, setMistakes] = useState(saved?.mistakes ?? 0);
    const [finished, setFinished] = useState(saved?.finished ?? false);
    const locked = useRef(false);
    const timer = useRef(null);

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
        },
        []
    );

    // ذخیره پیشرفت. اگر دور تمام شده ولی هنوز انیمیشن رفتن به دور بعد پخش نشده، همان حالت «دور بعد» ذخیره می‌شود
    useEffect(() => {
        const cur = rounds[roundIdx] ?? [];
        const roundDone = cur.length > 0 && matched.size === cur.length;
        const nextIdx = roundDone ? roundIdx + 1 : roundIdx;
        onSaveRef.current?.({
            rounds,
            roundIdx: nextIdx,
            matched: roundDone ? [] : [...matched],
            mistakes,
            finished: finished || (roundDone && nextIdx >= rounds.length),
        });
    }, [rounds, roundIdx, matched, mistakes, finished]);

    useEffect(() => {
        if (finished) onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finished]);

    const round = rounds[roundIdx] ?? [];
    // ستون چپ: انگلیسی، ستون راست: فارسی؛ هرکدام با ترتیب جدا
    const sides = useMemo(() => ({ left: shuffle(round), right: shuffle(round) }), [round]);

    if (words.length === 0) return <ModuleEmpty />;

    if (finished) {
        return (
            <ModuleDone
                subtitle={mistakes === 0 ? 'همه را بدون اشتباه جفت کردی' : `با ${mistakes} اشتباه تمام شد`}
                onNext={onNext}
                onPrev={onPrev}
                onRestart={onRestart}
            />
        );
    }

    const nextRound = () => {
        if (roundIdx + 1 < rounds.length) {
            setRoundIdx(roundIdx + 1);
            setMatched(new Set());
            locked.current = false;
        } else {
            setFinished(true);
        }
    };

    const pick = (side, word) => {
        if (locked.current || matched.has(word.id)) return;
        if (side === 'l' && autoSpeak) speak(word.en);

        const l = side === 'l' ? (selL === word.id ? null : word.id) : selL;
        const r = side === 'r' ? (selR === word.id ? null : word.id) : selR;
        setSelL(l);
        setSelR(r);
        if (l == null || r == null) return;

        if (l === r) {
            const m = new Set(matched).add(l);
            setMatched(m);
            setSelL(null);
            setSelR(null);
            if (m.size === round.length) {
                locked.current = true;
                timer.current = setTimeout(nextRound, 600);
            }
        } else {
            locked.current = true;
            setWrong({ l, r });
            setMistakes((c) => c + 1);
            timer.current = setTimeout(() => {
                setWrong(null);
                setSelL(null);
                setSelR(null);
                locked.current = false;
            }, 600);
        }
    };

    const styleOf = (side, id) => {
        if (matched.has(id)) return styles.tileDone;
        if (wrong && (side === 'l' ? wrong.l : wrong.r) === id) return styles.tileWrong;
        if ((side === 'l' ? selL : selR) === id) return styles.tileSel;
        return null;
    };

    return (
        <ScrollView contentContainerStyle={styles.root}>
            <ProgressBar value={(roundIdx + matched.size / Math.max(round.length, 1)) / rounds.length} />
            <Text style={styles.question}>هر کلمه را با معنی‌اش جفت کن</Text>

            <View style={styles.cols}>
                <View style={styles.col}>
                    {sides.left.map((w) => (
                        <Pressable key={w.id} onPress={() => pick('l', w)} style={[styles.tile, styleOf('l', w.id)]}>
                            <Text style={styles.en} numberOfLines={2}>{w.en}</Text>
                        </Pressable>
                    ))}
                </View>
                <View style={styles.col}>
                    {sides.right.map((w) => (
                        <Pressable key={w.id} onPress={() => pick('r', w)} style={[styles.tile, styleOf('r', w.id)]}>
                            <Text style={styles.fa} numberOfLines={2}>{w.fa}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { padding: 20, gap: 8 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginVertical: 12 },
    cols: { flexDirection: 'row', gap: 12 },
    col: { flex: 1, gap: 10 },
    tile: {
        minHeight: 64,
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        paddingHorizontal: 10,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileSel: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    tileDone: { backgroundColor: colors.successSoft, borderColor: colors.success, opacity: 0.5 },
    tileWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    en: { fontSize: 19, fontWeight: '700', color: colors.text, textAlign: 'center' },
    fa: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
});