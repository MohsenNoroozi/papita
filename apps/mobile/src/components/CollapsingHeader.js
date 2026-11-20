import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import {
    BACK_RIGHT,
    BACK_W,
    HEADER_H,
    SHADOW_H,
    TABS_H,
    TITLE_SCALE,
} from '@/hooks/useCollapsingHeader';

const GRAY = '#D9DCE3'; // بالای gradient
const WHITE = '#FFFFFF';

const CollapsingHeader = React.memo(function CollapsingHeader({
                                                                  header, title, tabs, tab, onSelectTab, onBack,
                                                              }) {
    const { insets, width, tabW, titleH } = header;
    return (
        <>
            {/* پس‌زمینه: سفید + gradient خاکستری→سفید که با اسکرول محو می‌شود */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.bg,
                    { height: header.gradH, transform: [{ scaleY: header.gradScaleY }] },
                ]}
            >
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: header.gradOpacity }]}>
                    <LinearGradient colors={[GRAY, WHITE]} style={StyleSheet.absoluteFill} />
                </Animated.View>
            </Animated.View>

            {/* تب‌ها: هم‌شیب اسکرول بالا می‌آیند و زیر هدر می‌ایستند */}
            <Animated.View style={[styles.tabs, { transform: [{ translateY: header.tabsY }] }]}>
                <View style={styles.tabsRow}>
                    {tabs.map((t, i) => (
                        <Pressable
                            key={t.key}
                            onPress={() => onSelectTab(i)}
                            style={styles.tabBtn}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: i === tab }}
                        >
                            <Text style={[styles.tabText, i === tab && styles.tabTextOn]}>{t.label}</Text>
                        </Pressable>
                    ))}
                </View>
                <Animated.View
                    style={[styles.indicator, { width: tabW, transform: [{ translateX: header.indicatorX }] }]}
                />
                {/* سایه ۴ پیکسلی زیر تب‌ها */}
                <Animated.View
                    pointerEvents="none"
                    style={[styles.shadow, { opacity: header.shadowOpacity }]}
                >
                    <LinearGradient
                        colors={['rgba(17,24,39,0.14)', 'rgba(17,24,39,0)']}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </Animated.View>

            {/* عنوان: پایین فضای خالی سمت راست؛ با اسکرول بالا و به چپ می‌آید و کنار back می‌ایستد */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.title,
                    { height: titleH, maxWidth: (width - 40) / TITLE_SCALE },
                    {
                        transform: [
                            { translateY: header.titleY },
                            { translateX: header.titleX },
                            { scale: header.titleScale },
                        ],
                    },
                ]}
            >
                <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            </Animated.View>

            {/* دکمه بازگشت (سمت راست هدر)؛ فلش به راست است چون جهت برنامه راست‌به‌چپ است */}
            <Pressable
                onPress={onBack}
                hitSlop={12}
                accessibilityLabel="بازگشت"
                style={[styles.back, { top: insets.top, height: HEADER_H }]}
            >
                <Ionicons name="chevron-forward" size={28} color={colors.text} />
            </Pressable>
        </>
    );
});

export default CollapsingHeader;

const styles = StyleSheet.create({
    bg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        transformOrigin: 'top',
    },
    back: {
        position: 'absolute',
        right: BACK_RIGHT,
        width: BACK_W,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    title: {
        position: 'absolute',
        top: 0,
        right: 20,
        justifyContent: 'center',
        alignItems: 'flex-end',
        transformOrigin: 'right center',
    },
    titleText: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'right' },
    tabs: { position: 'absolute', top: 0, left: 0, right: 0, height: TABS_H },
    tabsRow: { flex: 1, flexDirection: 'row-reverse' },
    tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 15, fontWeight: '600', color: colors.sub },
    tabTextOn: { color: colors.primary, fontWeight: '800' },
    indicator: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: colors.primary },
    shadow: { position: 'absolute', left: 0, right: 0, bottom: -SHADOW_H, height: SHADOW_H },
});