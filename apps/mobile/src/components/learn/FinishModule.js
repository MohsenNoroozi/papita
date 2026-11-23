import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';
import Button from '@/components/Button';
import SpeakButton from '@/components/SpeakButton';
import { ModuleEmpty } from './shared';

/**
 * قدم «پایان»: همه کلمات زیر هم، و بعد از آن دکمه «همه را یاد گرفتم»
 * addCount: تعداد کلماتی که هنوز در جعبه نیستند
 * onLearnedAll: افزودن کلمات به جعبه ۱
 */
export default function FinishModule({ words, addCount = 0, onLearnedAll }) {
    if (words.length === 0) return <ModuleEmpty />;

    return (
        <ScrollView contentContainerStyle={styles.root}>
            <Text style={styles.title}>کلمات این دسته</Text>

            {words.map((w) => (
                <View key={w.id} style={styles.row}>
                    <SpeakButton text={w.en} size={16} />
                    <Text style={styles.en}>{w.en}</Text>
                    <Text style={styles.fa}>{w.fa}</Text>
                </View>
            ))}

            <Button
                title="همه را یاد گرفتم"
                disabled={addCount === 0}
                onPress={onLearnedAll}
                style={styles.cta}
            />
            {addCount === 0 ? (
                <Text style={styles.note}>همه این کلمات قبلاً در جعبه‌ها هستند</Text>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { padding: 20, gap: 8 },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    en: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'left' },
    fa: { flex: 1, fontSize: 15, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },
    cta: { marginTop: 16 },
    note: { fontSize: 13, color: colors.sub, textAlign: 'center' },
});