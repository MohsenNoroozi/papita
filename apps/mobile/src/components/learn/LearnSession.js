import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { colors } from '@/theme';
import Button from '@/components/Button';
import ScreenHeader from '@/components/ScreenHeader';
import Stepper from '@/components/Stepper';
import IntroModule from './IntroModule';
import MultipleChoiceModule from './MultipleChoiceModule';
import WritingModule from './WritingModule';
import MatchingModule from './MatchingModule';
import ScrambleModule from './ScrambleModule';
import FinishModule from './FinishModule';

import { stopSpeaking } from '@/speech';
import { useSettings } from '@/context/SettingsContext';
import FloatingBar from '@/components/FloatingBar';

/**
 * قدم‌های صفحه یادگیری. هر Component این props را می‌گیرد:
 *   words, pool            کلمات دسته / کل کاتالوگ
 *   onNext, onPrev         رفتن به قدم بعد/قبل (undefined اگر وجود ندارد)
 *   onComplete             اعلام کامل‌شدن قدم (برای تیک stepper)
 *   onRestart              اجرای مجدد همین قدم از ابتدا
 *   addCount, onLearnedAll فقط FinishModule استفاده می‌کند
 * برای افزودن قدم جدید فقط یک خط به این آرایه اضافه کن.
 */
export const STEPS = [
    { key: 'intro', label: 'معرفی', Component: IntroModule },
    { key: 'choice', label: '۴ گزینه‌ای', Component: MultipleChoiceModule },
    { key: 'match', label: 'تطبیق', Component: MatchingModule },
    { key: 'scramble', label: 'کلمات درهم', Component: ScrambleModule },
    { key: 'write', label: 'نوشتن', Component: WritingModule },
    { key: 'finish', label: 'پایان', Component: FinishModule },
];

/**
 * ماژول مادر صفحه یادگیری
 * words: کلمات پیشنهادی (باید بین رندرها پایدار باشد)
 * onDone: بعد از افزودن کلمات به جعبه ۱ صدا زده می‌شود
 */
export default function LearnSession({ words, title = 'یادگیری', onDone }) {
    const { progress, addToBox1 } = useProgress();
    const { words: pool } = useCatalog();
    const { autoSpeak, setAutoSpeak } = useSettings();
    const [excluded, setExcluded] = useState(() => new Set());
    const [current, setCurrent] = useState(0);
    const [done, setDone] = useState(() => new Set());
    // پنجره انتخاب کلمات فعلاً دکمه‌ای برای باز شدن ندارد؛ برای فعال‌کردن، جایی setEditOpen(true) صدا بزن
    const [editOpen, setEditOpen] = useState(false);
    const [runs, setRuns] = useState({}); // شمارنده اجرای مجدد هر قدم

    const active = useMemo(() => words.filter((w) => !excluded.has(w.id)), [words, excluded]);
    const toAdd = useMemo(() => active.filter((w) => !progress[w.id]), [active, progress]);
    // با تغییر کلمات، ماژول‌ها از نو ساخته می‌شوند
    const wordsKey = useMemo(() => active.map((w) => w.id).join(','), [active]);

    const markDone = useCallback(
        (key) => setDone((prev) => (prev.has(key) ? prev : new Set(prev).add(key))),
        []
    );

    // اجرای مجدد یک قدم از ابتدا
    const restart = (key) => {
        setRuns((r) => ({ ...r, [key]: (r[key] ?? 0) + 1 }));
        setDone((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
    };

    const changeWords = (next) => {
        setExcluded(next);
        setDone(new Set()); // قدم‌ها با کلمات جدید باید دوباره انجام شوند
    };

    const toggle = (id) => {
        const next = new Set(excluded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        changeWords(next);
    };

    const addAll = () => {
        addToBox1(toAdd.map((w) => w.id));
        onDone?.();
    };

    const step = STEPS[current];
    const Component = step.Component;

    const toggleSound = () => {
        if (autoSpeak) stopSpeaking();
        setAutoSpeak(!autoSpeak);
    };

    const barItems = [
        {
            key: 'prev',
            icon: 'arrow-forward-outline',
            label: 'مرحله قبل',
            disabled: current === 0,
            onPress: () => setCurrent(current - 1),
        },
        { key: 'restart', icon: 'refresh-outline', label: 'تکرار مرحله', onPress: () => restart(step.key) },
        {
            key: 'sound',
            icon: autoSpeak ? 'volume-high-outline' : 'volume-mute-outline',
            label: 'صدا',
            muted: !autoSpeak,
            accessibilityState: { selected: autoSpeak },
            onPress: toggleSound,
        },
        {
            key: 'next',
            icon: 'arrow-back-outline',
            label: 'مرحله بعد',
            filled: true,
            disabled: current === STEPS.length - 1,
            onPress: () => setCurrent(current + 1),
        },
    ];

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScreenHeader title={title} />

            <Stepper steps={STEPS} current={current} done={done} onChange={setCurrent}>
                <Component
                    key={`${step.key}:${wordsKey}:${runs[step.key] ?? 0}`}
                    words={active}
                    pool={pool}
                    onPrev={current > 0 ? () => setCurrent(current - 1) : undefined}
                    onNext={current < STEPS.length - 1 ? () => setCurrent(current + 1) : undefined}
                    onComplete={() => markDone(step.key)}
                    onRestart={() => restart(step.key)}
                    addCount={toAdd.length}
                    onLearnedAll={addAll}
                />
            </Stepper>

            <FloatingBar items={barItems} />

            {/* ویرایش کلمات */}
            <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
                <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
                    <ScreenHeader title="کلمات این دسته" showBack={false} />
                    <View style={styles.editInfo}>
                        <Pressable onPress={() => changeWords(new Set())} hitSlop={8}>
                            <Text style={styles.link}>انتخاب همه</Text>
                        </Pressable>
                        <Text style={styles.editCount}>{`${active.length} از ${words.length} انتخاب شده`}</Text>
                    </View>
                    <FlatList
                        data={words}
                        keyExtractor={(w) => String(w.id)}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => {
                            const on = !excluded.has(item.id);
                            return (
                                <Pressable onPress={() => toggle(item.id)} style={[styles.row, !on && styles.rowOff]}>
                                    <Ionicons
                                        name={on ? 'checkbox' : 'square-outline'}
                                        size={24}
                                        color={on ? colors.primary : colors.sub}
                                    />
                                    <Text style={styles.rowEn}>{item.en}</Text>
                                    <Text style={styles.rowFa}>{item.fa}</Text>
                                </Pressable>
                            );
                        }}
                    />
                    <View style={styles.footer}>
                        <Button title="تأیید" onPress={() => setEditOpen(false)} />
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    footer: { padding: 20, paddingTop: 8 },
    editInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    editCount: { fontSize: 14, color: colors.sub },
    link: { fontSize: 14, fontWeight: '700', color: colors.primary },
    list: { paddingHorizontal: 20, gap: 8 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    rowOff: { opacity: 0.5 },
    rowEn: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'left' },
    rowFa: { flex: 1, fontSize: 15, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },
});