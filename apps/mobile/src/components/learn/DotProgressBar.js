import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import ProgressBar from '@/components/ProgressBar';

const HEIGHT = 32;

/**
 * نوار پیشرفت با یک دایره کوچک برای هر کلمه؛ با لمس هر دایره به همان کلمه می‌رود.
 * از چپ به راست: اولین کلمه سمت چپ، آخرین کلمه سمت راست.
 * count: تعداد کلمات | index: کلمه فعلی (از ۰) | onSelect(i)
 */
export default function DotProgressBar({ count, index, onSelect }) {
    if (count <= 0) return null;
    // با زیاد شدن کلمات دایره‌ها کوچک‌تر می‌شوند
    const size = count <= 10 ? 14 : count <= 20 ? 10 : 7;
    const value = count > 1 ? index / (count - 1) : 1;

    return (
        <View style={styles.wrap}>
            <View style={styles.inner}>
                <View style={styles.track}>
                    <ProgressBar value={value} />
                </View>

                {Array.from({ length: count }, (_, i) => {
                    const pct = count > 1 ? i / (count - 1) : 0.5;
                    const reached = i <= index;
                    const current = i === index;
                    const d = current ? size + 4 : size;
                    return (
                        <Pressable
                            key={i}
                            onPress={() => onSelect?.(i)}
                            hitSlop={{ top: 10, bottom: 10, left: 3, right: 3 }}
                            accessibilityRole="button"
                            accessibilityLabel={`کلمه ${i + 1}`}
                            style={[
                                styles.dot,
                                {
                                    left: `${pct * 100}%`,
                                    width: d,
                                    height: d,
                                    borderRadius: d / 2,
                                    marginLeft: -d / 2,
                                    marginTop: -d / 2,
                                },
                                reached ? styles.dotOn : styles.dotOff,
                                current && styles.dotCurrent,
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { height: HEIGHT, justifyContent: 'center', direction: 'ltr' },
    // فضای کناری برای اینکه دایره‌های دو سر از صفحه بیرون نزنند
    inner: { height: HEIGHT, marginHorizontal: 12 },
    track: { position: 'absolute', left: 0, right: 0, top: (HEIGHT - 8) / 2 },
    dot: { position: 'absolute', top: HEIGHT / 2, borderWidth: 2 },
    dotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    dotOff: { backgroundColor: colors.card, borderColor: colors.starEmpty },
    dotCurrent: { borderColor: colors.primarySoft, borderWidth: 3 },
});