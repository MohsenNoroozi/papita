import React, { useEffect, useRef } from 'react';
import { Animated, Easing, PanResponder, Text, View, StyleSheet, Dimensions } from 'react-native';
import SpeakButton from './SpeakButton';
import BoxStars from './BoxStars';
import { speak, AUTO_PLAY_ON_REVIEW } from '../speech';
import { colors } from '../theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = Math.min(380, height * 0.45);

const SWIPE_THRESHOLD = width * 0.3; // کشیدن افقی در حالت عادی (مرور)
const EASY_SWIPE_THRESHOLD = width * 0.12; // کشیدن افقی در حالت easySwipe (یادگیری)
const FLICK_VELOCITY = 0.3; // سرعت (px/ms) برای تشخیص ضربه سریع
const FLICK_MIN_DISTANCE = 20; // حداقل حرکت برای ضربه سریع
const SWIPE_THRESHOLD_Y = height * 0.12; // کشیدن عمودی

// جای شروع کارت جدید قبل از انیمیشن ورود
const ENTER_OFFSETS = {
    left: { x: -width, y: 0 },
    right: { x: width, y: 0 },
    top: { x: 0, y: -height * 0.5 },
    bottom: { x: 0, y: height * 0.5 },
};

export default function FlashCard({
                                      word,
                                      onSwipe, // افقی: onSwipe(true) = راست، onSwipe(false) = چپ
                                      onSwipeUp, // اختیاری
                                      onSwipeDown, // اختیاری
                                      allowLeft = true,
                                      allowRight = true,
                                      verticalExits = true, // true: کارت با کشیدن بالا/پایین خارج می‌شود. false: برمی‌گردد (و فقط کالبک صدا زده می‌شود)
                                      easySwipe = false, // آستانه کمتر + تشخیص ضربه سریع برای کشیدن افقی
                                      enterFrom, // 'left' | 'right' | 'top' | 'bottom': کارت با انیمیشن از آن سمت وارد می‌شود
                                      tint = true,
                                      showExample = false,
                                      showBox = false, // نمایش ستاره‌های جعبه پایین کارت
                                      box, // شماره جعبه کلمه (undefined = در هیچ جعبه‌ای نیست)
                                      autoPlay = AUTO_PLAY_ON_REVIEW,
                                  }) {
    const start = ENTER_OFFSETS[enterFrom] ?? { x: 0, y: 0 };
    const pan = useRef(new Animated.ValueXY(start)).current;
    const tintY = useRef(new Animated.Value(0)).current; // فقط برای رنگ هنگام کشیدن عمودی
    const flip = useRef(new Animated.Value(0)).current;
    const flipped = useRef(false);
    const busy = useRef(!!enterFrom); // در حین ورود/خروج کارت لمس نادیده گرفته می‌شود

    // آخرین مقدار propها برای PanResponder (که فقط یک‌بار ساخته می‌شود)
    const handlers = useRef({});
    handlers.current = {
        onSwipe,
        onSwipeUp,
        onSwipeDown,
        allowLeft,
        allowRight,
        verticalExits,
        easySwipe,
    };

    // فقط هنگام ساخته‌شدن کارت (یا تغییر کلمه) پخش می‌شود، نه با تغییر autoPlay
    const autoPlayRef = useRef(autoPlay);
    autoPlayRef.current = autoPlay;
    useEffect(() => {
        if (autoPlayRef.current) speak(word.en);
    }, [word.en]);

    // انیمیشن ورود کارت
    useEffect(() => {
        if (!enterFrom) return;
        Animated.timing(pan, {
            toValue: { x: 0, y: 0 },
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start(() => {
            busy.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleFlip = () => {
        flipped.current = !flipped.current;
        Animated.spring(flip, {
            toValue: flipped.current ? 1 : 0,
            friction: 8,
            tension: 10,
            useNativeDriver: false,
        }).start();
    };

    const springBack = () => {
        Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
            Animated.timing(tintY, { toValue: 0, duration: 180, useNativeDriver: false }),
        ]).start();
    };

    const flingX = (dir) => {
        busy.current = true;
        Animated.timing(pan, {
            toValue: { x: dir * width * 1.2, y: 0 },
            duration: 200,
            useNativeDriver: false,
        }).start(() => handlers.current.onSwipe?.(dir > 0));
    };

    // dir: -1 = بالا، 1 = پایین
    const flingY = (dir, done) => {
        busy.current = true;
        Animated.timing(pan, {
            toValue: { x: 0, y: dir * height },
            duration: 220,
            useNativeDriver: false,
        }).start(done);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !busy.current,
            onPanResponderMove: (_, g) => {
                const h = handlers.current;
                let x;
                let y;
                if (Math.abs(g.dy) > Math.abs(g.dx)) {
                    // حرکت عمودی: اگر کنشی برایش تعریف نشده، کارت فقط کمی تکان می‌خورد
                    const hasAction = g.dy < 0 ? !!h.onSwipeUp : !!h.onSwipeDown;
                    const factor = hasAction ? (h.verticalExits ? 1 : 0.4) : 0.2;
                    x = g.dx * 0.2;
                    y = g.dy * factor;
                } else {
                    const blocked = (g.dx > 0 && !h.allowRight) || (g.dx < 0 && !h.allowLeft);
                    x = blocked ? g.dx * 0.2 : g.dx;
                    y = g.dy * 0.2;
                }
                pan.setValue({ x, y });
                tintY.setValue(y);
            },
            onPanResponderRelease: (_, g) => {
                const h = handlers.current;
                const isTap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;

                if (isTap) {
                    pan.setValue({ x: 0, y: 0 });
                    tintY.setValue(0);
                    toggleFlip();
                    return;
                }

                // ---- عمودی ----
                if (Math.abs(g.dy) > Math.abs(g.dx)) {
                    if (g.dy < -SWIPE_THRESHOLD_Y && h.onSwipeUp) {
                        if (h.verticalExits) {
                            flingY(-1, () => handlers.current.onSwipeUp?.());
                        } else {
                            springBack();
                            h.onSwipeUp();
                        }
                        return;
                    }
                    if (g.dy > SWIPE_THRESHOLD_Y && h.onSwipeDown) {
                        if (h.verticalExits) {
                            flingY(1, () => handlers.current.onSwipeDown?.());
                        } else {
                            springBack();
                            h.onSwipeDown();
                        }
                        return;
                    }
                    springBack();
                    return;
                }

                // ---- افقی ----
                const distance = h.easySwipe ? EASY_SWIPE_THRESHOLD : SWIPE_THRESHOLD;
                const flick =
                    h.easySwipe && Math.abs(g.vx) > FLICK_VELOCITY && Math.abs(g.dx) > FLICK_MIN_DISTANCE;
                const goRight = h.allowRight && (g.dx > distance || (flick && g.dx > 0));
                const goLeft = h.allowLeft && (g.dx < -distance || (flick && g.dx < 0));

                if (goRight) flingX(1);
                else if (goLeft) flingX(-1);
                else springBack();
            },
            onPanResponderTerminate: springBack,
        })
    ).current;

    const rotate = pan.x.interpolate({
        inputRange: [-width, 0, width],
        outputRange: ['-12deg', '0deg', '12deg'],
    });

    // رنگ کارت هنگام کشیدن: افقی (مرور) یا عمودی (یادگیری)
    const bg = tint
        ? pan.x.interpolate({
            inputRange: [-width / 2, 0, width / 2],
            outputRange: ['#fecaca', '#ffffff', '#bbf7d0'],
            extrapolate: 'clamp',
        })
        : onSwipeUp || onSwipeDown
            ? tintY.interpolate({
                inputRange: [-height * 0.2, 0, height * 0.2],
                outputRange: [colors.successSoft, colors.card, colors.dangerSoft],
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
                    showBox && styles.faceWithStars,
                    { backgroundColor: bg, transform: [{ perspective: 1000 }, { rotateY: frontRot }] },
                ]}
            >
                <Text style={styles.en}>{word.en}</Text>
                {showBox ? <BoxStars box={box} style={styles.stars} /> : null}
            </Animated.View>

            {/* پشت کارت: ترجمه فارسی (+ جمله مثال اختیاری) */}
            <Animated.View
                style={[
                    styles.face,
                    showBox && styles.faceWithStars,
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
                {showBox ? <BoxStars box={box} style={styles.stars} /> : null}
            </Animated.View>

            {/* دکمه صدا: بیرون از وجه‌های چرخان تا روی هر دو طرف کارت دیده شود */}
            <View style={styles.overlay} pointerEvents="box-none">
                <SpeakButton text={word.en} size={22} style={styles.speak} />
            </View>
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
    faceWithStars: { paddingBottom: 56 },
    en: { fontSize: 38, fontWeight: '700', color: colors.text },
    fa: { fontSize: 34, fontWeight: '600', color: colors.text, textAlign: 'center' },
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
    stars: { position: 'absolute', bottom: 16, left: 0, right: 0 },
    overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, elevation: 10 },
    speak: { position: 'absolute', top: 16, right: 16 },
});