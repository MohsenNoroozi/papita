import React, { useEffect, useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from 'react-native';

import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import Button from '@/components/Button';
import StepResult from './StepResult';
import SwipeCards from './SwipeCards';
import { ModuleEmpty } from './shared';

const makeItem = (word) => ({ id: Math.random().toString(36).slice(2), word });
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
// الگوی کمکی: مثلاً "fox" ← "_ _ _"
const blanks = (en) => en.split('').map((c) => (c === ' ' ? '\u00A0' : '_')).join(' ');

/**
 * قدم «تسلط» (نوشتن): معنی فارسی را می‌بیند و کلمه انگلیسی را تایپ می‌کند
 * هر کلمه یک کارت است + یک صفحه پایانی؛ کشیدن به راست = بعدی، کشیدن به چپ = قبلی.
 * saved / onSave: ذخیره پیشرفت تا با رفتن به مرحله دیگر از بین نرود
 */
export default function WritingModule({ words, saved, onSave, onComplete }) {
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const [items] = useState(() => saved?.items ?? shuffle(words).map(makeItem));
    const [solved, setSolved] = useState(() => new Set(saved?.solved ?? []));
    const [missed, setMissed] = useState(() => saved?.missed ?? []);
    const last = useRef(saved?.last ?? -1); // اندیس آخرین کارت حل‌شده
    // بازگشت: یک کارت بعد از آخرین جواب درست (یا صفحه پایانی)
    const [index, setIndex] = useState(() => Math.min(last.current + 1, items.length));
    const [text, setText] = useState('');
    const [status, setStatus] = useState('idle'); // idle | correct | wrong
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
        setText('');
        setStatus('idle');
        setIndex(i);
    };

    const current = isResult ? null : items[index];
    const wid = current?.word.id;
    const isSolved = !!current && solved.has(wid);
    const idle = !!current && status === 'idle' && !isSolved;

    const check = () => {
        if (!idle || !text.trim()) return;
        if (norm(text) === norm(current.word.en)) {
            const nextSolved = new Set(solved).add(wid);
            last.current = index;
            setSolved(nextSolved);
            setStatus('correct');
            timer.current = setTimeout(() => {
                timer.current = null;
                cards.current?.goTo(nextSolved.size === total ? total : index + 1);
            }, 800);
        } else {
            setStatus('wrong');
            setMissed((m) => (m.includes(wid) ? m : [...m, wid]));
        }
    };

    // بعد از جواب غلط: کارت پاک می‌شود و به کارت بعدی (یا صفحه پایانی) می‌رود
    const continueAfterWrong = () => {
        cards.current?.goTo(index + 1);
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
                    `${solved.size} از ${total} کلمه را درست نوشتی`,
                    `${firstTry} از ${total} کلمه را بار اول درست نوشتی`,
                ]}
                sections={[
                    { title: 'هنوز درست ننوشته‌ای', words: unsolvedWords },
                    { title: 'نیاز به تمرین بیشتر', words: missedWords },
                ]}
            />
        );
    } else {
        // کارت حل‌شده با رفت‌وبرگشت، پاسخ درست را نشان می‌دهد
        const shownText = isSolved ? current.word.en : text;
        const shownStatus = isSolved ? 'correct' : status;

        content = (
            <>
                <Text style={styles.question}>این کلمه را به انگلیسی بنویس</Text>
                <Pressable
                    onPress={() => speak(current.word.en)}
                    accessibilityRole="button"
                    accessibilityLabel="پخش تلفظ"
                    style={styles.faBox}
                >
                    <Text style={styles.fa}>{current.word.fa}</Text>
                </Pressable>
                <Text style={styles.blanks}>{blanks(current.word.en)}</Text>

                <TextInput
                    style={[
                        styles.input,
                        shownStatus === 'correct' && styles.inputCorrect,
                        shownStatus === 'wrong' && styles.inputWrong,
                    ]}
                    value={shownText}
                    onChangeText={(t) => idle && setText(t)}
                    onSubmitEditing={check}
                    editable={!isSolved}
                    placeholder="کلمه را بنویس"
                    placeholderTextColor={colors.sub}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoFocus
                    returnKeyType="done"
                />

                {status === 'wrong' && !isSolved ? (
                    <>
                        <Text style={styles.answer}>{`پاسخ درست: ${current.word.en}`}</Text>
                        <Button title="ادامه" onPress={continueAfterWrong} />
                    </>
                ) : (
                    <Button title="بررسی" disabled={!text.trim() || !idle} onPress={check} />
                )}
            </>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.root}
                keyboardShouldPersistTaps="handled"
            >
                <SwipeCards ref={cards} count={total + 1} dotCount={total} index={index} onChange={go}>
                    {content}
                </SwipeCards>
            </ScrollView>

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    root: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 4 },
    faBox: { backgroundColor: colors.bg, borderRadius: 18, paddingVertical: 24, paddingHorizontal: 16 },
    fa: { fontSize: 30, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
    blanks: { fontSize: 22, letterSpacing: 2, color: colors.sub, textAlign: 'center', writingDirection: 'ltr' },
    input: {
        backgroundColor: colors.bg,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 22,
        color: colors.text,
        textAlign: 'left',
        writingDirection: 'ltr',
    },
    inputCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    inputWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    answer: { fontSize: 18, fontWeight: '800', color: colors.danger, textAlign: 'center', writingDirection: 'ltr' },
});