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
import SwipeCards, { findNext } from './SwipeCards';
import { ModuleDone, ModuleEmpty } from './shared';

const makeItem = (word) => ({ id: Math.random().toString(36).slice(2), word });
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
// الگوی کمکی: مثلاً "fox" ← "_ _ _"
const blanks = (en) => en.split('').map((c) => (c === ' ' ? '\u00A0' : '_')).join(' ');

/**
 * قدم «نوشتن»: معنی فارسی را می‌بیند و کلمه انگلیسی را تایپ می‌کند
 * هر کلمه یک کارت است؛ کشیدن به چپ = بعدی، کشیدن به راست = قبلی.
 */
export default function WritingModule({ words, onNext, onPrev, onRestart, onComplete }) {
    const [items] = useState(() => shuffle(words).map(makeItem));
    const [index, setIndex] = useState(0);
    const [solved, setSolved] = useState(() => new Set());
    const [text, setText] = useState('');
    const [status, setStatus] = useState('idle'); // idle | correct | wrong
    const [missed, setMissed] = useState([]);
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

    if (words.length === 0) return <ModuleEmpty />;

    if (finished) {
        return (
            <ModuleDone
                subtitle={`${words.length - missed.length} از ${words.length} کلمه را بار اول درست نوشتی`}
                onNext={onNext}
                onPrev={onPrev}
                onRestart={onRestart}
            />
        );
    }

    const current = items[index];
    const wid = current.word.id;
    const isSolved = solved.has(wid);
    const idle = status === 'idle' && !isSolved;
    // کارت حل‌شده با رفت‌وبرگشت، پاسخ درست را نشان می‌دهد
    const shownText = isSolved ? current.word.en : text;
    const shownStatus = isSolved ? 'correct' : status;

    // رفتن به کارت دیگر: وضعیت کارت قبلی پاک می‌شود
    const go = (i) => {
        clearTimeout(timer.current);
        timer.current = null;
        setText('');
        setStatus('idle');
        setIndex(i);
    };

    const check = () => {
        if (!idle || !text.trim()) return;
        if (norm(text) === norm(current.word.en)) {
            const nextSolved = new Set(solved).add(wid);
            setSolved(nextSolved);
            setStatus('correct');
            timer.current = setTimeout(() => {
                timer.current = null;
                if (nextSolved.size === items.length) {
                    setFinished(true);
                    return;
                }
                const nx = findNext(items.length, index, (i) => nextSolved.has(items[i].word.id));
                if (nx >= 0) cards.current?.goTo(nx);
            }, 800);
        } else {
            setStatus('wrong');
            setMissed((m) => (m.includes(wid) ? m : [...m, wid]));
        }
    };

    // بعد از جواب غلط: کارت پاک می‌شود و به کارت تمام‌نشده بعدی می‌رود (اگر نبود همین‌جا می‌ماند)
    const continueAfterWrong = () => {
        setText('');
        setStatus('idle');
        const nx = findNext(items.length, index, (i) => solved.has(items[i].word.id));
        if (nx >= 0) cards.current?.goTo(nx);
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
                <SwipeCards ref={cards} count={items.length} index={index} onChange={go}>
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