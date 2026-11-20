import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export default function SelectionBar({ count, onSelectAll, onClear, bottom = 78 }) {
    return (
        <View style={[styles.bar, { bottom }]}>
            <Text style={styles.text}>{`${count} کلمه انتخاب شده`}</Text>
            <View style={styles.actions}>
                <Pressable onPress={onSelectAll} hitSlop={8}>
                    <Text style={styles.link}>انتخاب همه</Text>
                </Pressable>
                <Pressable onPress={onClear} hitSlop={8}>
                    <Text style={[styles.link, styles.cancel]}>لغو</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
    },
    text: { fontSize: 14, fontWeight: '700', color: colors.text },
    actions: { flexDirection: 'row', gap: 18 },
    link: { fontSize: 14, fontWeight: '700', color: colors.primary },
    cancel: { color: colors.danger },
});