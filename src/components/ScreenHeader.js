import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function ScreenHeader({ title, right }) {
    const router = useRouter();
    return (
        <View style={styles.row}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.side}>
                <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
                {title}
            </Text>
            <View style={[styles.side, styles.right]}>{right}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    side: { width: 64 },
    right: { alignItems: 'flex-end' },
    title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.text },
});