import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { speak, speakSequence } from '@/speech';
import { colors } from '@/theme';
import StepResult from './StepResult';
import SwipeCards from './SwipeCards';
import { ModuleEmpty } from './shared';

// زمان‌بندی تلفظ خودکار (میلی‌ثانیه)
const PAUSE_BETWEEN_WORDS = 700;
const PAUSE_BEFORE_EXAMPLE = 1200;

/**
 * قدم «آشنایی»: یک کارت برای هر کلمه + صفحه پایانی
 * words: آرایه {id,en,fa,example?,exampleFa?}
 * saved / onSave: ذخیره پیشرفت (کلمات دیده‌شده) تا با رفتن به مرحله دیگر از بین نرود
 * کشیدن به راست = بعدی، کشیدن به چپ = قبلی (داخل SwipeCards)
 * «دیدن» هر کارت مثل جواب درست حساب می‌شود
 */
export default function IntroModule({ words, saved, onSave, onComplete }) {
    const { autoSpeak } = useSettings();
    const autoSpeakRef = useRef(autoSpeak);
    autoSpeakRef.current = autoSpeak;
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    const [viewed, setViewed] = useState(() => new Set(saved?.viewed ?? []));
    const last = useRef(saved?.last ?? -1); // آخرین کارت دیده‌شده
    // بازگشت: یک کارت بعد از آخرین کارت دیده‌شده (یا صفحه پایانی)
    const [index, setIndex] = useState(() => Math.min(last.current + 1, words.length));

    const word = words[index]; // undefined = صفحه پایانی
    const isResult = words.length > 0 && index >= words.length;
    const complete = words.length > 0 && viewed.size === words.length;

    // تا کاربر جابه‌جا نشده، تلفظ خودکار نداریم (کلمه اول هنگام ورود به صفحه خوانده نمی‌شود)
    const hasMoved = useRef(false);

    // کارت نمایش‌داده‌شده «دیده‌شده» ثبت می‌شود
    useEffect(() => {
        if (index >= words.length) return;
        last.current = index;
        const id = words[index].id;
        setViewed((v) => (v.has(id) ? v : new Set(v).add(id)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    useEffect(() => {
        onSaveRef.current?.({ viewed: [...viewed], last: last.current });
    }, [viewed, index]);

    useEffect(() => {
        if (complete) onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [complete]);

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

    if (words.length === 0) return <ModuleEmpty />;

    return (
        <View style={styles.flex}>
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <SwipeCards
                    count={words.length + 1}
                    dotCount={words.length}
                    index={index}
                    onChange={go}
                    style={styles.card}
                >
                    {isResult ? (
                        <StepResult
                            complete={complete}
                            lines={[`${viewed.size} از ${words.length} کلمه را دیدی`]}
                        />
                    ) : (
                        <>
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
                                    {word.exampleFa ? (
                                        <Text style={styles.exampleFa}>{word.exampleFa}</Text>
                                    ) : null}
                                </View>
                            ) : null}
                        </>
                    )}
                </SwipeCards>
            </ScrollView>

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
});