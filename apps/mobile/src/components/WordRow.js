import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import BoxStars from './BoxStars';
import DueBadge from './DueBadge';
import SpeakButton from './SpeakButton';

// فقط با تغییر propهای خودش دوباره رندر می‌شود (همه propها primitive یا آبجکت ثابت‌اند)
const WordRow = React.memo(function WordRow({
                                                id, en, fa, box, status, dimmed, selected, selecting, onToggle,
                                            }) {
    const toggle = useCallback(() => onToggle?.(id), [onToggle, id]);
    return (
        <Pressable
            onPress={selecting ? toggle : undefined}
            onLongPress={onToggle ? toggle : undefined}
            style={[styles.row, dimmed && styles.dimmed, selected && styles.selected]}
        >
            <SpeakButton text={en} size={18} />
            <View style={styles.wordCol}>
                <Text style={styles.en}>{en}</Text>
                <BoxStars box={box} size={14} style={styles.stars} />
            </View>
            <View style={styles.faCol}>
                <Text style={styles.fa}>{fa}</Text>
                {status ? <DueBadge status={status} /> : null}
            </View>
            {selecting && (
                <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={selected ? colors.primary : colors.starEmpty}
                />
            )}
        </Pressable>
    );
});

export default WordRow;

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    dimmed: { opacity: 0.45 },
    selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    wordCol: { flex: 1, gap: 4 },
    en: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
    stars: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
    faCol: { flex: 1, gap: 4, alignItems: 'flex-end' },
    fa: { fontSize: 16, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },
});