import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, Text, View, StyleSheet, Dimensions } from 'react-native';
import SpeakButton from './SpeakButton';
import { speak, AUTO_PLAY_ON_REVIEW } from '../speech';
import { colors } from '../theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = Math.min(380, height * 0.45);
const SWIPE_THRESHOLD = width * 0.3;

export default function FlashCard({
                                      word,
                                      onSwipe,
                                      allowLeft = true,
                                      allowRight = true,
                                      tint = true,
                                      showExample = false,
                                      autoPlay = AUTO_PLAY_ON_REVIEW,
                                  }) {
    const pan = useRef(new Animated.ValueXY()).current;
    const flip = useRef(new Animated.Value(0)).current;
    const flipped = useRef(false);

    // آخرین مقدار propها را برای PanResponder (که فقط یک‌بار ساخته می‌شود) نگه می‌داریم
    const onSwipeRef = useRef(onSwipe);
    onSwipeRef.current = onSwipe;
    const allowRef = useRef({ allowLeft, allowRight });
    allowRef.current = { allowLeft, allowRight };

    useEffect(() => {
        if (autoPlay) speak(word.en);
    }, [word.en, autoPlay]);

    const toggleFlip = () => {
        flipped.current = !flipped.current;
        Animated.spring(flip, {
            toValue: flipped.current ? 1 : 0,
            friction: 8,
            tension: 10,
            useNativeDriver: false,
        }).start();
    };

    const fling = (dir) => {
        Animated.timing(pan, {
            toValue: { x: dir * width * 1.2, y: 0 },
            duration: 200,
            useNativeDriver: false,
        }).start(() => onSwipeRef.current(dir > 0));
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, g) => {
                const { allowLeft, allowRight } = allowRef.current;
                const blocked = (g.dx > 0 && !allowRight) || (g.dx < 0 && !allowLeft);
                pan.setValue({ x: blocked ? g.dx * 0.2 : g.dx, y: g.dy * 0.2 });
            },
            onPanResponderRelease: (_, g) => {
                const { allowLeft, allowRight } = allowRef.current;
                const isTap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
                if (isTap) {
                    pan.setValue({ x: 0, y: 0 });
                    toggleFlip();
                } else if (g.dx > SWIPE_THRESHOLD && allowRight) {
                    fling(1);
                } else if (g.dx < -SWIPE_THRESHOLD && allowLeft) {
                    fling(-1);
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                }
            },
        })
    ).current;

    const rotate = pan.x.interpolate({
        inputRange: [-width, 0, width],
        outputRange: ['-12deg', '0deg', '12deg'],
    });

    const bg = tint
        ? pan.x.interpolate({
            inputRange: [-width / 2, 0, width / 2],
            outputRange: ['#fecaca', '#ffffff', '#bbf7d0'],
            extrapolate: 'clamp',
        })
        : colors.card;

    const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.container,
                { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
            ]}
        >
            {/* روی کارت: کلمه انگلیسی */}
            <Animated.View
                style={[
                    styles.face,
                    { backgroundColor: bg, transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
                ]}
            >
                <Text style={styles.en}>{word.en}</Text>
                <Text style={styles.hint}>برای دیدن ترجمه لمس کنید</Text>
            </Animated.View>

            {/* پشت کارت: ترجمه فارسی (+ جمله مثال اختیاری) */}
            <Animated.View
                style={[
                    styles.face,
                    { backgroundColor: bg, transform: [{ perspective: 1000 }, { rotateY: backRot }] },
                ]}
            >
                <Text style={styles.fa}>{word.fa}</Text>
                {showExample && word.example ? (
                    <View style={styles.exampleBox}>
                        <Text style={styles.exampleEn}>{word.example}</Text>
                        {word.exampleFa ? <Text style={styles.exampleFa}>{word.exampleFa}</Text> : null}
                    </View>
                ) : null}
            </Animated.View>

            {/* دکمه صدا بیرون از وجه‌های چرخان است تا روی هر دو طرف کارت در دسترس باشد */}
            <SpeakButton text={word.en} size={22} style={styles.speak} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { width: CARD_WIDTH, height: CARD_HEIGHT, alignSelf: 'center' },
    face: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backfaceVisibility: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    en: { fontSize: 38, fontWeight: '700', color: colors.text },
    fa: { fontSize: 34, fontWeight: '600', color: colors.text, textAlign: 'center' },
    hint: { position: 'absolute', bottom: 20, fontSize: 14, color: '#9ca3af' },
    exampleBox: {
        alignSelf: 'stretch',
        backgroundColor: colors.bg,
        borderRadius: 14,
        padding: 12,
        marginTop: 20,
        gap: 6,
    },
    exampleEn: { fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 21 },
    exampleFa: { fontSize: 14, color: colors.sub, textAlign: 'center', writingDirection: 'rtl' },
    speak: { position: 'absolute', top: 16, right: 16 },
});