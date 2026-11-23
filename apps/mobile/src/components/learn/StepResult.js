import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

/**
 * صفحه پایانی هر مرحله (داخل SwipeCards نمایش داده می‌شود)
 * complete: مرحله کامل شده؟ فقط در این حالت «آفرین!» نمایش داده می‌شود
 * lines: جمله‌های نتیجه
 * sections: [{ title, words: [{id,en,fa}] }]؛ بخش‌های خالی نمایش داده نمی‌شوند
 */
export default function StepResult({ complete, lines = [], sections = [] }) {
    return (
        <View style={styles.wrap}>
            {complete ? (
                <>
                    <Text style={styles.emoji}>🎉</Text>
                    <Text style={styles.title}>آفرین!</Text>
                </>
            ) : (
                <Text style={styles.heading}>نتایج این مرحله</Text>
            )}

            {lines.map((l, i) => (
                <Text key={i} style={styles.line}>
                    {l}
                </Text>
            ))}

            {sections
                .filter((s) => s.words.length > 0)
                .map((s) => (
                    <View key={s.title} style={styles.section}>
                        <Text style={styles.sectionTitle}>{s.title}</Text>
                        {s.words.map((w) => (
                            <View key={w.id} style={styles.row}>
                                <Text style={styles.en}>{w.en}</Text>
                                <Text style={styles.fa}>{w.fa}</Text>
                            </View>
                        ))}
                    </View>
                ))}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 8, paddingVertical: 8 },
    emoji: { fontSize: 56 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
    heading: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
    line: { fontSize: 15, color: colors.sub, textAlign: 'center' },
    section: { alignSelf: 'stretch', gap: 8, marginTop: 12 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.sub, textAlign: 'center' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.bg,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    en: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'left' },
    fa: { flex: 1, fontSize: 15, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },
});