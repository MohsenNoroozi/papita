import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconTextButton from './IconTextButton';
import { colors } from '@/theme';

export const FLOATING_BAR_HEIGHT = 56;
export const FLOATING_BAR_GAP = 8; // فاصله کادر از پایین (بالای safe-area و نوار خانه/منابع)
const PAD = 4;
const ITEM_H = FLOATING_BAR_HEIGHT - PAD * 2;

// کل فضایی که نوار از پایین parent اشغال می‌کند
export function useFloatingBarSpace(safeBottom = true) {
    const insets = useSafeAreaInsets();
    return (safeBottom ? insets.bottom : 0) + FLOATING_BAR_GAP + FLOATING_BAR_HEIGHT;
}

/**
 * items: [{ key, icon, label, onPress, onLongPress?, disabled?, filled?, muted?,
 *           accessibilityState?, render?(style) }]
 * آیتم اول سمت راست است (مثل Stepper). با render می‌توان دکمه سفارشی (مثل FillIconTextButton) گذاشت.
 * آخرین فرزند ستون صفحه باشد؛ safe-area و نوار خانه/منابع (useBarInset) را خودش لحاظ می‌کند.
 *
 * safeBottom=false: وقتی parent از قبل بالای نوار تب‌ها/safe-area است (صفحات داخل تب)
 */
export default function FloatingBar({ items, safeBottom = true, style }) {
    const insets = useSafeAreaInsets();
    if (!items || items.length === 0) return null;

    return (
        <View
            pointerEvents="box-none"
            style={[styles.outer, { paddingBottom: (safeBottom ? insets.bottom : 0) + FLOATING_BAR_GAP }, style]}
        >
            <View style={styles.shadowWrap}>
                <View style={styles.pill}>
                    {items.map((it) =>
                        it.render ? (
                            <React.Fragment key={it.key}>{it.render(styles.item)}</React.Fragment>
                        ) : (
                            <IconTextButton
                                key={it.key}
                                style={styles.item}
                                icon={it.icon}
                                label={it.label}
                                onPress={it.onPress}
                                onLongPress={it.onLongPress}
                                disabled={it.disabled}
                                filled={it.filled}
                                muted={it.muted}
                                accessibilityState={it.accessibilityState}
                            />
                        )
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: { paddingHorizontal: 20, paddingTop: 6, backgroundColor: 'transparent' },
    shadowWrap: {
        borderRadius: FLOATING_BAR_HEIGHT / 2,
        shadowColor: colors.barShadow,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    pill: {
        flexDirection: 'row-reverse', // آیتم اول سمت راست
        height: FLOATING_BAR_HEIGHT,
        padding: PAD,
        gap: 2,
        borderRadius: FLOATING_BAR_HEIGHT / 2,
        backgroundColor: colors.barGlass,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: colors.barBorder,
    },
    item: { height: ITEM_H, borderRadius: ITEM_H / 2, gap: 0 },
});