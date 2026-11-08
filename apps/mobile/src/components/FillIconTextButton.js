import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const HEIGHT = 68; // هم‌اندازه IconTextButton

function Content({ icon, label, color }) {
    return (
        <>
            <Ionicons name={icon} size={24} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1} adjustsFontSizeToFit>
                {label}
            </Text>
        </>
    );
}

// دکمه آیکون + متن که پس‌زمینه‌اش از پایین به بالا به نسبت ratio (۰ تا ۱) پر می‌شود
export default function FillIconTextButton({ icon, label, ratio = 0, onPress, disabled, style }) {
    const anim = useRef(new Animated.Value(ratio)).current;

    useEffect(() => {
        Animated.timing(anim, { toValue: ratio, duration: 350, useNativeDriver: false }).start();
    }, [ratio, anim]);

    const fillHeight = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, HEIGHT],
        extrapolate: 'clamp',
    });

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
        >
            {/* آیکون و متن آبی روی بخش خالی */}
            <View style={styles.layer}>
                <Content icon={icon} label={label} color={colors.primary} />
            </View>

            {/* بخش پر از پایین؛ نسخه سفید آیکون و متن فقط همان قسمت را می‌پوشاند */}
            <Animated.View style={[styles.fill, { height: fillHeight }]}>
                <View style={styles.fillLayer}>
                    <Content icon={icon} label={label} color="#FFFFFF" />
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flex: 1,
        height: HEIGHT,
        borderRadius: 16,
        backgroundColor: colors.primarySoft,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        gap0: 4,
        paddingHorizontal: 4,
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
    layer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 4,
    },
    fill: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: colors.primary,
    },
    fillLayer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap0: 4,
        paddingHorizontal: 4,
    },
    label: { fontSize: 12, fontWeight: '700' },
});