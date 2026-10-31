import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MASTERED, starsForBox } from '../leitner';
import { colors } from '../theme';

const STAR_COUNT = 5;

// box: شماره جعبه کلمه. undefined یا null یعنی کلمه در هیچ جعبه‌ای نیست
export default function BoxStars({ box, size = 22, style }) {
    const scale = useRef(new Animated.Value(1)).current;
    const mounted = useRef(false);

    // ضربان کوتاه هر بار که جعبه تغییر می‌کند (نه در اولین نمایش)
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        Animated.sequence([
            Animated.timing(scale, { toValue: 1.25, duration: 120, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
    }, [box, scale]);

    const mastered = box === MASTERED;
    const filled = box ? starsForBox(box, STAR_COUNT) : 0;

    return (
        <Animated.View
            pointerEvents="none"
            accessibilityLabel={mastered ? 'کاملاً یادگرفته‌شده' : `جعبه ${box ?? 0}`}
            style={[styles.row, style, { transform: [{ scale }] }]}
        >
            {mastered ? (
                <Ionicons name="trophy" size={size + 8} color={colors.gold} />
            ) : (
                Array.from({ length: STAR_COUNT }, (_, i) => {
                    const v = filled - i; // ≥۱ پر، ≥۰٫۵ نیم‌پر، وگرنه خالی
                    const name = v >= 1 ? 'star' : v >= 0.5 ? 'star-half' : 'star-outline';
                    return (
                        <Ionicons
                            key={i}
                            name={name}
                            size={size}
                            color={v >= 0.5 ? colors.primary : colors.starEmpty}
                        />
                    );
                })
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});