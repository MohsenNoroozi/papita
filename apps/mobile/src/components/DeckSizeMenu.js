import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DECK_SIZE_OPTIONS } from '@/leitner';
import { colors } from '@/theme';

export default function DeckSizeMenu({ value, onSelect, options = DECK_SIZE_OPTIONS, style }) {
    return (
        <View style={[styles.menu, style]}>
            {options.map((n) => {
                const on = n === value;
                return (
                    <Pressable
                        key={n}
                        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                        onPress={() => onSelect(n)}
                    >
                        <Text style={[styles.text, on && styles.textOn]}>{`${n} کلمه`}</Text>
                        {on && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    menu: {
        position: 'absolute',
        left: 20,
        width: 160,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 6,
        zIndex: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    pressed: { backgroundColor: colors.bg },
    text: { fontSize: 16, color: colors.text },
    textOn: { fontWeight: '800', color: colors.primary },
});