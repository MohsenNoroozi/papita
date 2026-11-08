import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function SplitButton({ title, onPress, onToggle, open, disabled, style }) {
    return (
        <View style={[styles.wrap, disabled && styles.disabled, style]}>
            <Pressable
                onPress={onToggle}
                disabled={disabled}
                accessibilityLabel="انتخاب تعداد کلمات دسته"
                style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
            >
                <Ionicons name={open ? 'chevron-down' : 'chevron-up'} size={22} color="#FFFFFF" />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={({ pressed }) => [styles.main, pressed && styles.pressed]}
            >
                <Text style={styles.text}>{title}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.primary,
        overflow: 'hidden',
    },
    arrow: { width: 52, alignItems: 'center', justifyContent: 'center' },
    divider: { width: 2, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.35)' },
    main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    text: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.4 },
});