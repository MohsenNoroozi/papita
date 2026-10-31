import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// دکمه دایره‌ای ساده فقط با آیکون. muted = حالت خاموش/غیرفعال‌نما (خاکستری)
export default function RoundIconButton({
                                            icon,
                                            onPress,
                                            size = 56,
                                            disabled,
                                            muted,
                                            accessibilityLabel,
                                            accessibilityState,
                                            style,
                                        }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={accessibilityState}
            style={({ pressed }) => [
                styles.base,
                { width: size, height: size, borderRadius: size / 2 },
                muted && styles.muted,
                disabled && styles.disabled,
                pressed && styles.pressed,
                style,
            ]}
        >
            <Ionicons name={icon} size={size * 0.5} color={muted ? colors.sub : colors.primary} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    muted: { backgroundColor: colors.border },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});