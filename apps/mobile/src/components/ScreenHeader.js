import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export default function ScreenHeader({ title, right, showBack = true, onBack }) {
    const router = useRouter();
    return (
        <View style={styles.row}>
            <View style={[styles.side, styles.left]}>{right}</View>
            <Text style={styles.title} numberOfLines={1}>
                {title}
            </Text>
            {showBack ? (
                <Pressable onPress={onBack ?? (() => router.back())} hitSlop={12} style={[styles.side, styles.right]}>
                    <Ionicons name="chevron-forward" size={28} color={colors.text} />
                </Pressable>
            ) : (
                <View style={styles.side} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.bar },
    side: { width: 32 },
    left: { alignItems: 'flex-start' },
    right: { alignItems: 'flex-end' },
    title: { flex: 1, textAlign: 'right', fontSize: 20, fontWeight: '800', color: colors.text },
});