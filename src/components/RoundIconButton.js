import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// دکمه دایره‌ای ساده فقط با آیکون.
// muted = خاکستری (خاموش)، filled = آبی توپر (کار اصلی)
export default function RoundIconButton({
                                            icon,
                                            onPress,
                                            size = 56,
                                            disabled,
                                            muted,
                                            filled,
                                            accessibilityLabel,
                                            accessibilityState,
                                            style,
                                        }) {
    const iconColor = filled ? '#FFFFFF' : muted ? colors.sub : colors.primary;
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
                filled && styles.filled,
                disabled && styles.disabled,
                pressed && styles.pressed,
                style,
            ]}
        >
            <Ionicons name={icon} size={size * 0.5} color={iconColor} />
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
    filled: { backgroundColor: colors.primary },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});