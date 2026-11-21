import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { shuffle } from '@/leitner';
import { stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import Button from '@/components/Button';
import ProgressBar from '@/components/ProgressBar';
import SpeakButton from '@/components/SpeakButton';
import { ModuleDone, ModuleEmpty } from './shared';

const makeItem = (word) => ({ id: Math.random().toString(36).slice(2), word });
const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
// الگوی کمکی: مثلاً "fox" ← "_ _ _"
const blanks = (en) => en.split('').map((c) => (c === ' ' ? '\u00A0' : '_')).join(' ');

/**
 * قدم «نوشتن»: معنی فارسی را می‌بیند و کلمه انگلیسی را تایپ می‌کند
 */
export default function WritingModule({ words, onNext, onPrev, onRestart, onComplete }) {
    const [queue, setQueue] = useState(() => shuffle(words).map(makeItem));
    const [text, setText] = useState('');
    const [status, setStatus] = useState('idle'); // idle | correct | wrong
    const [correct, setCorrect] = useState(0);
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

    const current = queue[0];

    const advance = (requeue) => {
        const rest = queue.slice(1);
        if (requeue) rest.push(makeItem(current.word));
        else setCorrect((c) => c + 1);
        setQueue(rest);
        setText('');
        setStatus('idle');
    };

    const check = () => {
        if (status !== 'idle' || !text.trim()) return;
        if (norm(text) === norm(current.word.en)) {
            setStatus('correct');
            timer.current = setTimeout(() => advance(false), 800);
        } else {
            setStatus('wrong');
            setMissed((m) => (m.includes(current.word.id) ? m : [...m, current.word.id]));
        }
    };

    return (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
                <ProgressBar value={correct / words.length} />

                <Text style={styles.question}>این کلمه را به انگلیسی بنویس</Text>
                <View style={styles.faBox}>
                    <Text style={styles.fa}>{current.word.fa}</Text>
                </View>
                <SpeakButton text={current.word.en} size={20} style={styles.speak} />
                <Text style={styles.blanks}>{blanks(current.word.en)}</Text>

                <TextInput
                    style={[
                        styles.input,
                        status === 'correct' && styles.inputCorrect,
                        status === 'wrong' && styles.inputWrong,
                    ]}
                    value={text}
                    onChangeText={(t) => status === 'idle' && setText(t)}
                    onSubmitEditing={check}
                    placeholder="کلمه را بنویس"
                    placeholderTextColor={colors.sub}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoFocus
                    returnKeyType="done"
                />

                {status === 'wrong' ? (
                    <>
                        <Text style={styles.answer}>{`پاسخ درست: ${current.word.en}`}</Text>
                        <Button title="ادامه" onPress={() => advance(true)} />
                    </>
                ) : (
                    <Button title="بررسی" disabled={!text.trim() || status !== 'idle'} onPress={check} />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    root: { padding: 20, gap: 12 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 12 },
    faBox: { backgroundColor: colors.card, borderRadius: 18, paddingVertical: 24, paddingHorizontal: 16 },
    fa: { fontSize: 30, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
    speak: { alignSelf: 'center' },
    blanks: { fontSize: 22, letterSpacing: 2, color: colors.sub, textAlign: 'center', writingDirection: 'ltr' },
    input: {
        backgroundColor: colors.card,
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