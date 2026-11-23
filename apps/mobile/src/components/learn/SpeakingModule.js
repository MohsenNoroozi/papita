import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    ExpoSpeechRecognitionModule,
    speechRecognitionSupported,
    useSpeechRecognitionEvent,
} from '@/speechRecognition';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import Button from '@/components/Button';
import StepResult from './StepResult';
import SwipeCards from './SwipeCards';
import { ModuleEmpty } from './shared';

const makeItem = (word) => ({ id: Math.random().toString(36).slice(2), word });

// حروف کوچک، بدون علامت نگارشی، فاصله‌های اضافه حذف می‌شود
const norm = (s) =>
    String(s ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9'\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// یکی از حدس‌های تشخیص گفتار باید با کلمه یکی باشد.
// برای کلمه تک‌بخشی، اگر کلمه داخل جمله شنیده‌شده باشد هم قبول است (مثلاً "the fox")
function isMatch(target, alternatives) {
    const t = norm(target);
    const multi = t.includes(' ');
    return alternatives.some((alt) => {
        const a = norm(alt);
        if (!a) return false;
        if (a === t) return true;
        return !multi && a.split(' ').includes(t);
    });
}

/**
 * قدم «تسلط» (تلفظ): معنی فارسی را می‌بیند و کلمه انگلیسی را با صدا می‌گوید
 * هر کلمه یک کارت است + یک صفحه پایانی؛ کشیدن به راست = بعدی، کشیدن به چپ = قبلی.
 * saved / onSave: ذخیره پیشرفت تا با رفتن به مرحله دیگر از بین نرود
 */
export default function SpeakingModule({ words, saved, onSave, onComplete }) {
    const { autoSpeak } = useSettings();
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const [items] = useState(() => saved?.items ?? shuffle(words).map(makeItem));
    const [solved, setSolved] = useState(() => new Set(saved?.solved ?? []));
    const [missed, setMissed] = useState(() => saved?.missed ?? []);
    const last = useRef(saved?.last ?? -1); // اندیس آخرین کارت حل‌شده
    // بازگشت: یک کارت بعد از آخرین جواب درست (یا صفحه پایانی)
    const [index, setIndex] = useState(() => Math.min(last.current + 1, items.length));
    const [status, setStatus] = useState('idle'); // idle | correct | wrong
    const [listening, setListening] = useState(false);
    const [heard, setHeard] = useState(''); // آخرین چیزی که شنیده شد
    const [note, setNote] = useState(''); // پیام خطا / «چیزی نشنیدم»
    const gotFinal = useRef(false);
    const timer = useRef(null);
    const cards = useRef(null);

    const total = items.length;
    const complete = total > 0 && solved.size === total;
    const isResult = total > 0 && index >= total;

    const current = isResult ? null : items[index];
    const wid = current?.word.id;
    const isSolved = !!current && solved.has(wid);
    const idle = !!current && status === 'idle' && !isSolved;

    // آخرین مقدارها برای هندلرهای رویداد
    const latest = useRef({});
    latest.current = { current, wid, idle, index, total, solved, autoSpeak };

    const markMissed = () => setMissed((m) => (m.includes(wid) ? m : [...m, wid]));

    // ---------- رویدادهای تشخیص گفتار ----------
    useSpeechRecognitionEvent('start', () => setListening(true));

    useSpeechRecognitionEvent('end', () => {
        setListening(false);
        if (!gotFinal.current && latest.current.idle) setNote('چیزی نشنیدم. دوباره امتحان کن');
    });

    useSpeechRecognitionEvent('error', (e) => {
        setListening(false);
        if (e.error === 'not-allowed') setNote('دسترسی به میکروفون یا تشخیص گفتار مجاز نیست');
        else if (e.error === 'no-speech') setNote('چیزی نشنیدم. دوباره امتحان کن');
        else if (e.error !== 'aborted') setNote('تشخیص گفتار انجام نشد. دوباره امتحان کن');
        gotFinal.current = true; // پیام «چیزی نشنیدم» روی پیام خطا نیاید
    });

    useSpeechRecognitionEvent('result', (e) => {
        const alts = (e.results ?? []).map((r) => r.transcript).filter(Boolean);
        if (alts.length === 0) return;
        setHeard(alts[0]);
        if (!e.isFinal) return;

        gotFinal.current = true;
        const { current: cur, idle: canAnswer, index: i, total: n, solved: sv } = latest.current;
        if (!cur || !canAnswer) return;

        if (isMatch(cur.word.en, alts)) {
            const nextSolved = new Set(sv).add(cur.word.id);
            last.current = i;
            setSolved(nextSolved);
            setStatus('correct');
            setNote('');
            if (latest.current.autoSpeak) speak(cur.word.en);
            timer.current = setTimeout(() => {
                timer.current = null;
                cards.current?.goTo(nextSolved.size === n ? n : i + 1);
            }, 1100);
        } else {
            setStatus('wrong');
            setMissed((m) => (m.includes(cur.word.id) ? m : [...m, cur.word.id]));
        }
    });

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
            try {
                ExpoSpeechRecognitionModule.abort();
            } catch {}
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
        try {
            ExpoSpeechRecognitionModule.abort();
        } catch {}
        setListening(false);
        setHeard('');
        setNote('');
        setStatus('idle');
        setIndex(i);
    };

    const startListening = async () => {
        if (!idle) return;
        if (!speechRecognitionSupported) {
            setNote('تشخیص گفتار در Expo Go کار نمی‌کند');
            return;
        }
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!perm.granted) {
            setNote('برای تلفظ باید دسترسی به میکروفون را مجاز کنی');
            return;
        }
        stopSpeaking(); // صدای خود برنامه با میکروفون قاطی نشود
        gotFinal.current = false;
        setHeard('');
        setNote('');
        ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: true,
            maxAlternatives: 5,
            continuous: false,
        });
    };

    const stopListening = () => ExpoSpeechRecognitionModule.stop();

    const toggleMic = () => (listening ? stopListening() : startListening());

    // بعد از جواب غلط: دوباره امتحان
    const retry = () => {
        setStatus('idle');
        setHeard('');
        setNote('');
    };

    // رد کردن (مثلاً جایی که نمی‌شود صحبت کرد): کلمه نیازمند تمرین حساب می‌شود
    const skip = () => {
        if (!idle) return;
        if (speechRecognitionSupported) markMissed();
        cards.current?.goTo(index + 1);
    };

    const continueAfterWrong = () => cards.current?.goTo(index + 1);

    const firstTry = items.filter((it) => solved.has(it.word.id) && !missed.includes(it.word.id)).length;
    const unsolvedWords = items.filter((it) => !solved.has(it.word.id)).map((it) => it.word);
    const missedWords = items.filter((it) => missed.includes(it.word.id)).map((it) => it.word);

    let content;
    if (isResult) {
        content = (
            <StepResult
                complete={complete}
                lines={[
                    `${solved.size} از ${total} کلمه را درست تلفظ کردی`,
                    `${firstTry} از ${total} کلمه را بار اول درست تلفظ کردی`,
                ]}
                sections={[
                    { title: 'هنوز درست تلفظ نکرده‌ای', words: unsolvedWords },
                    { title: 'نیاز به تمرین بیشتر', words: missedWords },
                ]}
            />
        );
    } else {
        // کارت حل‌شده با رفت‌وبرگشت، پاسخ درست را نشان می‌دهد
        const shownStatus = isSolved ? 'correct' : status;
        const showAnswer = isSolved || status === 'correct' || status === 'wrong';

        content = (
            <>
                <Text style={styles.question}>این کلمه را به انگلیسی بگو</Text>

                <View style={styles.faBox}>
                    <Text style={styles.fa}>{current.word.fa}</Text>
                </View>

                <View
                    style={[
                        styles.answerBox,
                        shownStatus === 'correct' && styles.answerCorrect,
                        shownStatus === 'wrong' && styles.answerWrong,
                    ]}
                >
                    {isSolved || status === 'correct' ? (
                        <Text style={styles.answerText}>{current.word.en}</Text>
                    ) : heard ? (
                        <Text style={[styles.heardText, status === 'wrong' && styles.heardWrong]}>{heard}</Text>
                    ) : (
                        <Text style={styles.placeholder}>
                            {!speechRecognitionSupported
                                ? 'تلفظ در Expo Go کار نمی‌کند (فقط در نسخه build)'
                                : listening
                                    ? 'در حال گوش دادن...'
                                    : 'روی میکروفون بزن و بگو'}
                        </Text>
                    )}
                </View>

                {status === 'wrong' && !isSolved ? (
                    <>
                        <Text style={styles.answer}>{`پاسخ درست: ${current.word.en}`}</Text>
                        <Button title="دوباره امتحان کن" variant="soft" onPress={retry} />
                        <Button title="ادامه" variant="ghost" onPress={continueAfterWrong} />
                    </>
                ) : (
                    <>
                        {!!note && !showAnswer ? <Text style={styles.note}>{note}</Text> : null}

                        <View style={styles.micWrap}>
                            <Pressable
                                onPress={toggleMic}
                                disabled={!idle || !speechRecognitionSupported}
                                accessibilityRole="button"
                                accessibilityLabel={listening ? 'توقف' : 'شروع تلفظ'}
                                style={({ pressed }) => [
                                    styles.mic,
                                    listening && styles.micOn,
                                    (!idle || !speechRecognitionSupported) && styles.micOff,
                                    pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                                ]}
                            >
                                <Ionicons
                                    name={listening ? 'stop' : 'mic'}
                                    size={34}
                                    color={listening ? '#FFFFFF' : colors.primary}
                                />
                            </Pressable>
                        </View>

                        <Button title="رد کردن" variant="ghost" disabled={!idle} onPress={skip} />
                    </>
                )}
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
    faBox: { backgroundColor: colors.bg, borderRadius: 18, paddingVertical: 24, paddingHorizontal: 16 },
    fa: { fontSize: 30, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
    answerBox: {
        minHeight: 64,
        backgroundColor: colors.bg,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    answerCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    answerWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    answerText: { fontSize: 24, fontWeight: '800', color: colors.text, writingDirection: 'ltr' },
    heardText: { fontSize: 22, color: colors.text, writingDirection: 'ltr' },
    heardWrong: { color: colors.danger },
    placeholder: { fontSize: 15, color: colors.sub, textAlign: 'center' },
    answer: { fontSize: 18, fontWeight: '800', color: colors.danger, textAlign: 'center', writingDirection: 'ltr' },
    note: { fontSize: 14, color: colors.danger, textAlign: 'center' },
    micWrap: { alignItems: 'center', marginVertical: 8 },
    mic: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micOn: { backgroundColor: colors.danger },
    micOff: { opacity: 0.4 },
});