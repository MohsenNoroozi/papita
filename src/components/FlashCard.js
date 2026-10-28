import React, { useRef } from 'react';
import { Animated, PanResponder, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SWIPE_THRESHOLD = width * 0.3;

export default function FlashCard({ word, onSwipe }) {
    const pan = useRef(new Animated.ValueXY()).current;
    const flip = useRef(new Animated.Value(0)).current;
    const flipped = useRef(false);

    // همیشه آخرین نسخه onSwipe را نگه می‌دارد
    const onSwipeRef = useRef(onSwipe);
    onSwipeRef.current = onSwipe;

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
                pan.setValue({ x: g.dx, y: g.dy * 0.2 });
            },
            onPanResponderRelease: (_, g) => {
                const isTap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
                if (isTap) {
                    pan.setValue({ x: 0, y: 0 });
                    toggleFlip();
                } else if (g.dx > SWIPE_THRESHOLD) {
                    fling(1); // بلد است
                } else if (g.dx < -SWIPE_THRESHOLD) {
                    fling(-1); // بلد نیست
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    const rotate = pan.x.interpolate({
        inputRange: [-width, 0, width],
        outputRange: ['-12deg', '0deg', '12deg'],
    });

    const bg = pan.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: ['#fecaca', '#ffffff', '#bbf7d0'],
        extrapolate: 'clamp',
    });

    const frontRot = flip.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });
    const backRot = flip.interpolate({
        inputRange: [0, 1],
        outputRange: ['180deg', '360deg'],
    });

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

            {/* پشت کارت: ترجمه فارسی */}
            <Animated.View
                style={[
                    styles.face,
                    { backgroundColor: bg, transform: [{ perspective: 1000 }, { rotateY: backRot }] },
                ]}
            >
                <Text style={styles.fa}>{word.fa}</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: CARD_WIDTH,
        height: 380,
        alignSelf: 'center',
    },
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
    en: { fontSize: 38, fontWeight: '700', color: '#111827' },
    fa: { fontSize: 34, fontWeight: '600', color: '#111827', textAlign: 'center' },
    hint: { position: 'absolute', bottom: 20, fontSize: 14, color: '#9ca3af' },
});