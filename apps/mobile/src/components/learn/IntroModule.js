import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { speak, speakSequence } from '@/speech';
import { colors } from '@/theme';
import DotProgressBar from './DotProgressBar';
import { ModuleEmpty, StepNav } from './shared';

// مثل صفحه مرور: کشیدن به راست = بعدی، کشیدن به چپ = قبلی (۱ = راست، -۱ = چپ)
const NEXT_DIR = 1;

// زمان‌بندی تلفظ خودکار (میلی‌ثانیه)
const PAUSE_BETWEEN_WORDS = 700;
const PAUSE_BEFORE_EXAMPLE = 1200;

const SWIPE_DISTANCE = 70;
const FLICK_VELOCITY = 0.3;

/**
 * قدم «معرفی»: یک کارت برای هر کلمه
 * words: آرایه {id,en,fa,example?,exampleFa?}
 * onNext / onPrev / onRestart: دکمه‌های پایین صفحه در آخرین کلمه
 * onComplete: وقتی به آخرین کلمه رسید
 */
export default function IntroModule({ words, onNext, onPrev, onRestart, onComplete }) {
    const { width } = useWindowDimensions();
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

    // ---------- جابه‌جایی بین کارت‌ها ----------
    const x = useRef(new Animated.Value(0)).current;
    const busy = useRef(false);

    const springBack = () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();

    // کارت فعلی به سمت dir خارج می‌شود و کارت جدید از سمت مخالف وارد می‌شود
    const animateTo = (next, dir) => {
        if (busy.current) return;
        busy.current = true;
        hasMoved.current = true;
        Animated.timing(x, { toValue: dir * width, duration: 180, useNativeDriver: true }).start(() => {
            setIndex(next);
            x.setValue(-dir * width);
            Animated.timing(x, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(() => {
                busy.current = false;
            });
        });
    };

    // سوایپ: dir = جهت کشیدن (-1 چپ، 1 راست)
    const swipe = (dir) => {
        const next = safeIndex + (dir === NEXT_DIR ? 1 : -1);
        if (next < 0 || next >= words.length) return springBack();
        animateTo(next, dir);
    };

    // لمس دایره روی نوار پیشرفت
    const jump = (i) => {
        if (i === safeIndex) return;
        animateTo(i, i > safeIndex ? NEXT_DIR : -NEXT_DIR);
    };

    const swipeRef = useRef(swipe);
    swipeRef.current = swipe;

    const responder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                !busy.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
            onPanResponderMove: (_, g) => x.setValue(g.dx),
            onPanResponderRelease: (_, g) => {
                const flick = Math.abs(g.vx) > FLICK_VELOCITY && Math.abs(g.dx) > 20;
                if (Math.abs(g.dx) > SWIPE_DISTANCE || flick) swipeRef.current(Math.sign(g.dx));
                else springBack();
            },
            onPanResponderTerminate: springBack,
        })
    ).current;

    const rotate = x.interpolate({
        inputRange: [-width, 0, width],
        outputRange: ['-8deg', '0deg', '8deg'],
    });

    if (!word) return <ModuleEmpty />;

    return (
        <View style={styles.flex}>
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <DotProgressBar count={words.length} index={safeIndex} onSelect={jump} />

                <Animated.View
                    {...responder.panHandlers}
                    style={[styles.card, { transform: [{ translateX: x }, { rotate }] }]}
                >
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
                </Animated.View>
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
    card: {
        backgroundColor: colors.card,
        borderRadius: 28,
        padding: 20,
        gap: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        marginTop: 48,
        minHeight: 365,
    },
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
