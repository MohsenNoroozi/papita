import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

// دکمه مستطیلی با آیکون بالا و متن زیر آن.
// filled = آبی توپر (کار اصلی)، muted = خاکستری (خاموش)
export default function IconTextButton({
                                           icon,
                                           label,
                                           onPress,
                                           disabled,
                                           filled,
                                           muted,
                                           accessibilityState,
                                           style,
                                       }) {
    const color = filled ? '#FFFFFF' : muted ? colors.sub : colors.barInactive;
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={accessibilityState}
            style={({ pressed }) => [
                styles.base,
                filled ? styles.filled : muted ? styles.muted : styles.soft,
                disabled && styles.disabled,
                pressed && styles.pressed,
                style,
            ]}
        >
            <Ionicons name={icon} size={24} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1} adjustsFontSizeToFit>
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flex: 1,
        height: 68,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 4,
        borderRadius: 16,
    },
    soft: { backgroundColor: 'transparent' },
    filled: { backgroundColor: colors.primary },
    muted: { backgroundColor: 'transparent' },
    disabled: { opacity: 0.4 },
    pressed: { backgroundColor: colors.barPressed },
    label: { fontSize: 12, fontWeight: '700' },
});
