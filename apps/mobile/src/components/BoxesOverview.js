import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

function FillBox({ value, color }) {
    const v = useRef(new Animated.Value(value)).current;

    useEffect(() => {
        Animated.timing(v, { toValue: value, duration: 350, useNativeDriver: false }).start();
    }, [value, v]);

    const height = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={styles.box}>
            <Animated.View style={[styles.fill, { height, backgroundColor: color }]} />
        </View>
    );
}

// counts: تعداد کلمات هر جعبه (جعبه ۱ تا N)
// mastered: کلمات کاملاً یادگرفته‌شده، total: کل کلمات منبع
export default function BoxesOverview({ counts, mastered, total }) {
    const items = [
        ...counts.map((count, i) => ({
            key: `box${i + 1}`,
            count,
            label: `جعبه ${i + 1}`,
            color: colors.primary,
        })),
        { key: 'mastered', count: mastered, trophy: true, color: colors.gold },
    ];

    return (
        <View style={styles.card}>
            {items.map((it) => {
                const pct = total > 0 ? it.count / total : 0;
                const fill = it.count > 0 ? Math.max(pct, 0.08) : 0; // حداقل کمی پر تا دیده شود
                return (
                    <View key={it.key} style={styles.col}>
                        <FillBox value={fill} color={it.color} />
                        <Text style={styles.count}>{it.count}</Text>
                        {it.trophy ? (
                            <Ionicons name="trophy" size={14} color={colors.gold} />
                        ) : (
                            <Text style={styles.label}>{it.label}</Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 14,
    },
    col: { flex: 1, alignItems: 'center', gap: 4 },
    box: {
        width: '100%',
        height: 64,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    fill: { width: '100%' },
    count: { fontSize: 16, fontWeight: '800', color: colors.text },
    label: { fontSize: 11, color: colors.sub },
});