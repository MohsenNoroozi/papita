import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BOX_NEW, BOX_MASTERED } from '@/leitner';
import { colors } from '@/theme';

function FillBox({ value, color, selected }) {
    const v = useRef(new Animated.Value(value)).current;

    useEffect(() => {
        Animated.timing(v, { toValue: value, duration: 350, useNativeDriver: false }).start();
    }, [value, v]);

    const height = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={[styles.box, selected && styles.boxSelected]}>
            <Animated.View style={[styles.fill, { height, backgroundColor: color }]} />
        </View>
    );
}

/**
 * کامپوننت عمومی نمایش جعبه‌ها
 *
 * fresh:    تعداد کلمات جدید (در هیچ جعبه‌ای نیستند)
 * counts:   تعداد کلمات هر جعبه (جعبه ۱ تا N)
 * mastered: تعداد کلمات کاملاً یادگرفته
 * selected: کلید جعبه انتخاب‌شده (BOX_NEW | 1..N | BOX_MASTERED | null)
 * onSelect(key): با لمس هر جعبه صدا زده می‌شود (انتخاب/لغو انتخاب با والد است)
 *
 * مجموع همه جعبه‌ها (شامل «جدید») مبنای ارتفاع پرشدگی است.
 */
export default function BoxesOverview({ fresh = 0, counts = [], mastered = 0, selected = null, onSelect }) {
    const items = [
        { key: BOX_NEW, count: fresh, label: 'جدید', color: colors.sub },
        ...counts.map((count, i) => ({
            key: i + 1,
            count,
            label: `جعبه ${i + 1}`,
            color: colors.primary,
        })),
        { key: BOX_MASTERED, count: mastered, trophy: true, color: colors.gold },
    ];
    const total = items.reduce((s, it) => s + it.count, 0);

    return (
        <View style={styles.card}>
            {items.map((it) => {
                const pct = total > 0 ? it.count / total : 0;
                const fill = it.count > 0 ? Math.max(pct, 0.08) : 0; // حداقل کمی پر تا دیده شود
                const isSel = selected === it.key;
                return (
                    <Pressable
                        key={String(it.key)}
                        onPress={() => onSelect?.(it.key)}
                        disabled={!onSelect}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSel }}
                        style={({ pressed }) => [
                            styles.col,
                            isSel && styles.colSelected,
                            pressed && styles.pressed,
                        ]}
                    >
                        <FillBox value={fill} color={it.color} selected={isSel} />
                        <Text style={styles.count}>{it.count}</Text>
                        {it.trophy ? (
                            <Ionicons name="trophy" size={14} color={colors.gold} />
                        ) : (
                            <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
                                {it.label}
                            </Text>
                        )}
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        gap: 0,
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 8,
    },
    col: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
        padding: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    colSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    pressed: { opacity: 0.8 },
    box: {
        width: '100%',
        height: 64,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    boxSelected: { borderColor: colors.primary },
    fill: { width: '100%' },
    count: { fontSize: 16, fontWeight: '800', color: colors.text },
    label: { fontSize: 11, color: colors.sub },
});