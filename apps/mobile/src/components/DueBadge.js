import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import { statusLabel } from '@/lib/reviewStatus';

const TONES = {
    new: { bg: '#EDE9FE', fg: '#6D28D9' },
    due: { bg: colors.successSoft, fg: colors.success },
    overdue: { bg: '#FFEDD5', fg: '#C2410C' },
    later: { bg: colors.border, fg: colors.sub },
    mastered: { bg: '#FEF3C7', fg: '#A16207' },
};

const boxes = StyleSheet.create(
    Object.fromEntries(Object.entries(TONES).map(([k, t]) => [k, { backgroundColor: t.bg }]))
);
const texts = StyleSheet.create(
    Object.fromEntries(Object.entries(TONES).map(([k, t]) => [k, { color: t.fg }]))
);

const DueBadge = React.memo(function DueBadge({ status, style }) {
    return (
        <View style={[styles.badge, boxes[status.kind], style]}>
            <Text style={[styles.text, texts[status.kind]]} numberOfLines={1}>
                {statusLabel(status)}
            </Text>
        </View>
    );
});

export default DueBadge;

const styles = StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-end' },
    text: { fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
});