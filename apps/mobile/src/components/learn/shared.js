import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import Button from '@/components/Button';

// دکمه‌های پایان هر قدم: مرحله بعد، تکرار همین مرحله، مرحله قبل
export function StepNav({ onNext, onPrev, onRestart, style }) {
    if (!onNext && !onPrev && !onRestart) return null;
    return (
        <View style={[styles.nav, style]}>
            {onNext || onRestart ? (
                <View style={styles.row}>
                    {onNext ? (
                        <Button
                            title="مرحله بعد"
                            onPress={onNext}
                            icon={<Ionicons name="arrow-back" size={18} />}
                            style={styles.half}
                        />
                    ) : null}
                    {onRestart ? (
                        <Button
                            title="تکرار مرحله"
                            variant="soft"
                            onPress={onRestart}
                            icon={<Ionicons name="refresh" size={18} />}
                            style={styles.half}
                        />
                    ) : null}
                </View>
            ) : null}
            {onPrev ? <Button title="مرحله قبل" variant="ghost" onPress={onPrev} /> : null}
        </View>
    );
}

export function ModuleEmpty() {
    return (
        <View style={styles.center}>
            <Text style={styles.empty}>کلمه‌ای برای یادگیری انتخاب نشده</Text>
        </View>
    );
}

// صفحه پایان یک قدم؛ دکمه‌ها به پایین صفحه چسبیده‌اند
export function ModuleDone({ title = 'آفرین!', subtitle, onNext, onPrev, onRestart }) {
    return (
        <View style={styles.flex}>
            <View style={styles.center}>
                <Text style={styles.emoji}>🎉</Text>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
            </View>
            <StepNav onNext={onNext} onPrev={onPrev} onRestart={onRestart} style={styles.bottomNav} />
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    nav: { alignSelf: 'stretch', gap: 8 },
    row: { flexDirection: 'row', gap: 8 },
    half: { flex: 1 },
    bottomNav: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    empty: { fontSize: 16, color: colors.sub },
    emoji: { fontSize: 56 },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center' },
    sub: { fontSize: 15, color: colors.sub, marginTop: 6, textAlign: 'center' },
});
