import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// دکمه دایره‌ای که پس‌زمینه‌اش از پایین به بالا به نسبت ratio (۰ تا ۱) پر می‌شود
export default function FillIconButton({
                                           ratio = 0,
                                           onPress,
                                           disabled,
                                           size = 56,
                                           icon = 'checkmark-done',
                                           accessibilityLabel,
                                           style,
                                       }) {
    const anim = useRef(new Animated.Value(ratio)).current;

    useEffect(() => {
        Animated.timing(anim, { toValue: ratio, duration: 350, useNativeDriver: false }).start();
    }, [ratio, anim]);

    const fillHeight = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, size],
        extrapolate: 'clamp',
    });
    const iconSize = size * 0.5;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [
                styles.base,
                { width: size, height: size, borderRadius: size / 2 },
                pressed && styles.pressed,
                style,
            ]}
        >
            {/* آیکون آبی روی بخش خالی */}
            <View style={[StyleSheet.absoluteFill, styles.center]}>
                <Ionicons name={icon} size={iconSize} color={colors.primary} />
            </View>

            {/* بخش پر از پایین؛ آیکون سفید فقط همان قسمت را می‌پوشاند */}
            <Animated.View style={[styles.fill, { height: fillHeight }]}>
                <View style={[styles.fillIcon, { width: size, height: size }]}>
                    <Ionicons name={icon} size={iconSize} color="#FFFFFF" />
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: { backgroundColor: colors.primarySoft, overflow: 'hidden' },
    pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
    center: { alignItems: 'center', justifyContent: 'center' },
    fill: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: colors.primary,
    },
    fillIcon: { position: 'absolute', left: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});