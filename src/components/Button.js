import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Button({ title, onPress, variant = 'primary', disabled, style }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.base,
                styles[variant],
                disabled && styles.disabled,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                style,
            ]}
        >
            <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center' },
    primary: { backgroundColor: colors.primary },
    soft: { backgroundColor: colors.primarySoft },
    ghost: { backgroundColor: 'transparent' },
    disabled: { opacity: 0.4 },
    text: { color: '#fff', fontSize: 17, fontWeight: '700' },
    softText: { color: colors.primary },
    ghostText: { color: colors.sub, fontWeight: '600' },
});