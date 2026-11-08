import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { speak } from '../speech';
import { colors } from '../theme';

const SLOW_RATE = 0.6;

export default function SpeakButton({ text, size = 28, rate, style }) {
    const box = size * 1.7;
    return (
        <Pressable
            onPress={() => speak(text, { rate })}
            onLongPress={() => speak(text, { rate: SLOW_RATE })}
            hitSlop={10}
            accessibilityLabel="پخش تلفظ"
            style={({ pressed }) => [
                styles.btn,
                { width: box, height: box, borderRadius: box / 2 },
                pressed && styles.pressed,
                style,
            ]}
        >
            <Ionicons name="volume-high" size={size} color={colors.primary} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: {
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
});