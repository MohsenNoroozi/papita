import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import SwipeCards from './SwipeCards';
import { useSettings } from '@/context/SettingsContext';
import { speak, speakSequence } from '@/speech';
import { ModuleEmpty, StepNav } from './shared';
import { colors } from '@/theme';

// زمان‌بندی تلفظ خودکار (میلی‌ثانیه)
const PAUSE_BETWEEN_WORDS = 700;
const PAUSE_BEFORE_EXAMPLE = 1200;

/**
 * قدم «معرفی»: یک کارت برای هر کلمه
 * words: آرایه {id,en,fa,example?,exampleFa?}
 * onNext / onPrev / onRestart: دکمه‌های پایین صفحه در آخرین کلمه
 * onComplete: وقتی به آخرین کلمه رسید
 * کشیدن به راست = بعدی، کشیدن به چپ = قبلی (داخل SwipeCards)
 */
export default function IntroModule({ words, onNext, onPrev, onRestart, onComplete }) {
    const { autoSpeak } = useSettings();
    const autoSpeakRef = useRef(autoSpeak);
    autoSpeakRef.current = autoSpeak;

    const [index, setIndex] = useState(0);
    const safeIndex = Math.min(index, Math.max(words.length - 1, 0));
    const word = words[safeIndex];
    const isLast = words.length > 0 && safeIndex === words.length - 1;

    // تا کاربر جابه‌جا نشده، تلفظ خودکار نداریم (کلمه اول هنگام ورود به صفحه خوانده نمی‌شود)
    const hasMoved = useRef(false);

    useEffect(() => {
        if (index !== safeIndex) setIndex(safeIndex);
    }, [index, safeIndex]);

    useEffect(() => {
        if (isLast) onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLast]);

    // ---------- تلفظ خودکار: کلمه دو بار، بعد جمله مثال ----------
    useEffect(() => {
        if (!word || !hasMoved.current || !autoSpeakRef.current) return;
        return speakSequence([
            { text: word.en },
            { text: word.en, pause: PAUSE_BETWEEN_WORDS },
            ...(word.example ? [{ text: word.example, pause: PAUSE_BEFORE_EXAMPLE }] : []),
        ]);
    }, [word?.id, word?.en, word?.example]);

    const go = (i) => {
        hasMoved.current = true;
        setIndex(i);
    };

    if (!word) return <ModuleEmpty />;

    return (
        <View style={styles.flex}>
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <SwipeCards count={words.length} index={safeIndex} onChange={go} style={styles.card}>
                    <View style={styles.enRow}>
                        <Text
                            onPress={() => speak(word.en)}
                            accessibilityRole="button"
                            accessibilityLabel={`پخش تلفظ ${word.en}`}
                            style={styles.en}
                        >
                            {word.en}
                        </Text>
                    </View>

                    <View style={styles.faBox}>
                        <Text style={styles.fa}>{word.fa}</Text>
                    </View>

                    {word.example ? (
                        <View style={styles.exampleBox}>
                            <Text
                                onPress={() => speak(word.example)}
                                accessibilityRole="button"
                                accessibilityLabel={`پخش تلفظ ${word.example}`}
                                style={styles.exampleEn}
                            >
                                {word.example}
                            </Text>
                            {word.exampleFa ? <Text style={styles.exampleFa}>{word.exampleFa}</Text> : null}
                        </View>
                    ) : null}
                </SwipeCards>
            </ScrollView>

            {/* دکمه‌ها به پایین صفحه چسبیده‌اند (۸ پیکسل فاصله) */}
            {isLast ? (
                <StepNav onNext={onNext} onPrev={onPrev} onRestart={onRestart} style={styles.nav} />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
    // روی استایل پایه SwipeCards اعمال می‌شود
    card: { gap: 16, minHeight: 365 },
    enRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 16 },
    en: { fontSize: 42, fontWeight: '800', color: colors.text, textAlign: 'left', flexShrink: 1 },
    faBox: {
        backgroundColor: colors.bg,
        borderRadius: 18,
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    fa: { fontSize: 30, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
    // فاصله بیشتر بین معنی و مثال (علاوه بر gap کارت)
    exampleBox: {
        gap: 8,
        marginTop: 36,
        padding: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.sub,
        borderRadius: 14,
    },
    exampleEn: { flexShrink: 1, fontSize: 18, color: colors.text, textAlign: 'left', lineHeight: 26 },
    exampleFa: { fontSize: 16, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },
    nav: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});