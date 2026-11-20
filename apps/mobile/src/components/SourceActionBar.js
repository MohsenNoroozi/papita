import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import RoundIconButton from './RoundIconButton';
import SplitButton from './SplitButton';
import DeckSizeMenu from './DeckSizeMenu';

export const ACTION_BAR_HEIGHT = 72;

// Fragment: لایه بستن منو و منو نسبت به صفحه والد جای می‌گیرند
const SourceActionBar = React.memo(function SourceActionBar({
                                                                learnTitle, learnDisabled, onLearn,
                                                                menuOpen, onToggleMenu, onCloseMenu,
                                                                deckSize, onChangeDeckSize,
                                                                reviewTitle, reviewDisabled, onReview,
                                                                quizDisabled, onQuiz,
                                                            }) {
    return (
        <>
            {menuOpen && <Pressable style={StyleSheet.absoluteFill} onPress={onCloseMenu} />}

            <View style={styles.footer}>
                <SplitButton
                    style={styles.learn}
                    title={learnTitle}
                    disabled={learnDisabled}
                    open={menuOpen}
                    onPress={onLearn}
                    onToggle={onToggleMenu}
                />
                <Pressable
                    onPress={onReview}
                    disabled={reviewDisabled}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                        styles.review,
                        reviewDisabled && styles.disabled,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.reviewText} numberOfLines={1} adjustsFontSizeToFit>
                        {reviewTitle}
                    </Text>
                </Pressable>
                <RoundIconButton
                    icon="extension-puzzle-outline"
                    size={56}
                    disabled={quizDisabled}
                    onPress={onQuiz}
                    accessibilityLabel="آزمون همه کلمات"
                />
            </View>

            {menuOpen && (
                <DeckSizeMenu
                    style={{ bottom: ACTION_BAR_HEIGHT + 6 }}
                    value={deckSize}
                    onSelect={onChangeDeckSize}
                />
            )}
        </>
    );
});

export default SourceActionBar;

const styles = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: ACTION_BAR_HEIGHT,
        paddingHorizontal: 20,
        backgroundColor: colors.bg,
    },
    learn: { flex: 1.4 },
    review: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    reviewText: { fontSize: 17, fontWeight: '700', color: colors.primary },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.85 },
});