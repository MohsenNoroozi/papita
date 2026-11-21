import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

/**
 * Stepper غیرخطی (مثل Quasar q-stepper با فعال بودن header-nav)
 *
 * steps:    [{ key, label }]
 * current:  شماره قدم فعال (از ۰)
 * done:     Set از keyهای قدم‌های کامل‌شده
 * onChange: با لمس هر قدم صدا زده می‌شود (کامل‌بودن قدم قبلی لازم نیست)
 * children: محتوای قدم فعال
 */
export default function Stepper({ steps, current, done = new Set(), onChange, children }) {
    return (
        <View style={styles.flex}>
            {/* قدم اول سمت راست است */}
            <View style={styles.header}>
                {steps.map((s, i) => {
                    const active = i === current;
                    const isDone = done.has(s.key);
                    const prevDone = i > 0 && done.has(steps[i - 1].key);
                    return (
                        <Pressable
                            key={s.key}
                            onPress={() => onChange(i)}
                            style={styles.item}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: active }}
                        >
                            <View style={styles.track}>
                                <View style={[styles.line, i === 0 && styles.lineHidden, prevDone && styles.lineOn]} />
                                <View
                                    style={[
                                        styles.circle,
                                        isDone && styles.circleDone,
                                        active && styles.circleActive,
                                    ]}
                                >
                                    {isDone && !active ? (
                                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                    ) : (
                                        <Text style={[styles.num, active && styles.numOn]}>{i + 1}</Text>
                                    )}
                                </View>
                                <View
                                    style={[
                                        styles.line,
                                        i === steps.length - 1 && styles.lineHidden,
                                        isDone && styles.lineOn,
                                    ]}
                                />
                            </View>
                            <Text
                                style={[styles.label, active && styles.labelOn]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                {s.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.flex}>{children}</View>
        </View>
    );
}

const CIRCLE = 30;

const styles = StyleSheet.create({
    flex: { flex: 1 },
    header: {
        flexDirection: 'row-reverse',
        backgroundColor: colors.card,
        borderRadius: 18,
        marginHorizontal: 16,
        marginTop: 4,
        marginBottom: 8,
        paddingVertical: 10,
        paddingHorizontal: 2,
    },
    item: { flex: 1, alignItems: 'center', gap: 4 },
    track: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'stretch' },
    line: { flex: 1, height: 2, backgroundColor: colors.border },
    lineHidden: { backgroundColor: 'transparent' },
    lineOn: { backgroundColor: colors.success },
    circle: {
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleDone: { backgroundColor: colors.success },
    circleActive: { backgroundColor: colors.primary },
    num: { fontSize: 14, fontWeight: '800', color: colors.sub },
    numOn: { color: '#FFFFFF' },
    label: { fontSize: 11, fontWeight: '600', color: colors.sub, paddingHorizontal: 2 },
    labelOn: { color: colors.text, fontWeight: '800' },
});