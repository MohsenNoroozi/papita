import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { DECK_SIZE_OPTIONS, isForLevel, isRelevant } from '@/leitner';
import { colors } from '@/theme';
import BoxStars from '@/components/BoxStars';
import RoundIconButton from '@/components/RoundIconButton';
import ScreenHeader from '@/components/ScreenHeader';
import SpeakButton from '@/components/SpeakButton';
import SplitButton from '@/components/SplitButton';

const HEADER_H = 56; // ردیف هدر (زیر نوار وضعیت)
const TABS_H = 40;
const TITLE_H = 40;
const TITLE_BOTTOM_GAP = 12; // فاصله عنوان تا تب‌ها در حالت باز
const TITLE_SCALE = 1.45; // اندازه عنوان در حالت باز نسبت به حالت sticky
const FOOTER_HEIGHT = 72;
const SIDE_PAD = 20; // فاصله عنوان از لبه راست در حالت باز
const BACK_W = 44;
const BACK_RIGHT = 16;
const TITLE_RIGHT_END = BACK_RIGHT + BACK_W + 4; // فاصله عنوان از لبه راست در حالت sticky (کنار دکمه back)
const GRAD_TOP = '#CBD0DA'; // خاکستری بالای صفحه
const WHITE = '#FFFFFF';
const SHADOW_FADE = 12; // سایه در آخرین چند پیکسلِ رسیدن تب‌ها ظاهر می‌شود

const TABS = [
    { key: 'words', label: 'واژه‌ها' },
    { key: 'videos', label: 'ویدئوها' },
    { key: 'sounds', label: 'صداها' },
];

// ردیف کلمه: فقط وقتی props خودش عوض شود دوباره رندر می‌شود
const WordRow = React.memo(function WordRow({ en, fa, box, dimmed }) {
    return (
        <View style={[styles.row, dimmed && styles.rowBelow]}>
            <SpeakButton text={en} size={18} />
            <View style={styles.wordCol}>
                <Text style={styles.en}>{en}</Text>
                <BoxStars box={box} size={14} style={styles.stars} />
            </View>
            <Text style={styles.fa}>{fa}</Text>
        </View>
    );
});

export default function SourceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const { id } = useLocalSearchParams();
    const sourceId = Number(id);
    const { getSource, getWordsOfSource } = useCatalog();
    const source = getSource(sourceId);
    const words = useMemo(() => getWordsOfSource(sourceId), [getWordsOfSource, sourceId]);

    const { progress } = useProgress();
    const { deckSize, setDeckSize, level } = useSettings();
    const [menuOpen, setMenuOpen] = useState(false);
    const [tab, setTab] = useState(0);

    // با ترک صفحه، منو بسته شود
    useFocusEffect(useCallback(() => () => setMenuOpen(false), []));

    // ---------- هندسه و انیمیشن ----------
    // نکته: مسیر عنوان و تب‌ها دقیقاً هم‌شیب اسکرول است (۱ پیکسل اسکرول = ۱ پیکسل حرکت)،
    // پس تا لحظه رسیدن به جای نهایی مثل بخشی از محتوا حرکت می‌کنند و همان‌جا می‌ایستند.
    const scrollY = useRef(new Animated.Value(0)).current;
    const tabIndex = useRef(new Animated.Value(0)).current;

    const g = useMemo(() => {
        const heroH = Math.round(height * 0.25); // فضای خالی زیر هدر
        const headerBottom = insets.top + HEADER_H;
        const tabsStart = headerBottom + heroH;
        const tabsEnd = headerBottom;
        const titleStart = tabsStart - TITLE_H - TITLE_BOTTOM_GAP;
        const titleEnd = insets.top + (HEADER_H - TITLE_H) / 2;
        return {
            headerBottom,
            tabsStart,
            tabsEnd,
            tabsD: tabsStart - tabsEnd,
            titleStart,
            titleEnd,
            titleD: titleStart - titleEnd,
        };
    }, [height, insets.top]);

    const tabsY = scrollY.interpolate({
        inputRange: [0, g.tabsD],
        outputRange: [g.tabsStart, g.tabsEnd],
        extrapolate: 'clamp',
    });
    const titleY = scrollY.interpolate({
        inputRange: [0, g.titleD],
        outputRange: [g.titleStart, g.titleEnd],
        extrapolate: 'clamp',
    });
    // عنوان علاوه بر بالا آمدن، به سمت چپ (کنار دکمه back) هم می‌آید؛ هر دو هم‌شیب اسکرول
    const titleX = scrollY.interpolate({
        inputRange: [0, g.titleD],
        outputRange: [0, -(TITLE_RIGHT_END - SIDE_PAD)],
        extrapolate: 'clamp',
    });
    // بلوک گرادیانی: لبه پایینش همیشه چسبیده به بالای تب‌هاست
    const blockY = scrollY.interpolate({
        inputRange: [0, g.tabsD],
        outputRange: [0, -g.tabsD],
        extrapolate: 'clamp',
    });
    const gradOpacity = scrollY.interpolate({
        inputRange: [0, g.tabsD],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });
    const shadowOpacity = scrollY.interpolate({
        inputRange: [g.tabsD - SHADOW_FADE, g.tabsD],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });
    const titleScale = scrollY.interpolate({
        inputRange: [0, g.titleD],
        outputRange: [TITLE_SCALE, 1],
        extrapolate: 'clamp',
    });

    const tabW = width / TABS.length;
    // تب اول سمت راست است (row-reverse)
    const indicatorX = tabIndex.interpolate({
        inputRange: TABS.map((_, i) => i),
        outputRange: TABS.map((_, i) => width - (i + 1) * tabW),
    });

    const selectTab = (i) => {
        setTab(i);
        setMenuOpen(false);
        Animated.timing(tabIndex, { toValue: i, duration: 220, useNativeDriver: true }).start();
    };

    const onScroll = useMemo(
        () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
        [scrollY]
    );

    const renderItem = useCallback(
        ({ item }) => (
            <WordRow
                en={item.en}
                fa={item.fa}
                box={progress[item.id]?.box}
                dimmed={!isRelevant(item, progress, level)}
            />
        ),
        [progress, level]
    );
    const keyExtractor = useCallback((w) => String(w.id), []);

    if (!source) {
        return (
            <View style={[styles.screen, { paddingTop: insets.top }]}>
                <ScreenHeader title="منبع" />
                <View style={styles.center}>
                    <Text style={styles.empty}>این منبع پیدا نشد</Text>
                </View>
            </View>
        );
    }

    const unboxed = words.filter((w) => !progress[w.id] && isForLevel(w, level)).length;
    const deckCount = Math.min(deckSize, unboxed);

    const isWordsTab = tab === 0;
    const data = isWordsTab ? words : [];
    const listTop = g.tabsStart + TABS_H + 10;

    return (
        <View style={styles.screen}>
            <Animated.FlatList
                style={styles.flex}
                data={data}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                windowSize={7}
                onScroll={onScroll}
                scrollEventThrottle={16}
                scrollIndicatorInsets={{ top: g.headerBottom + TABS_H }}
                contentContainerStyle={[
                    styles.list,
                    // حداقل ارتفاع: حتی با محتوای کم یا تب خالی، امکان جمع شدن کامل هدر هست
                    { paddingTop: listTop, minHeight: height + g.tabsD },
                ]}
                ListEmptyComponent={
                    <Text style={styles.empty}>
                        {tab === 0 ? 'کلمه‌ای برای این منبع پیدا نشد' : 'به‌زودی'}
                    </Text>
                }
            />

            {/* پس‌زمینه هدر + گرادیان: با تب‌ها بالا می‌رود و گرادیان کم‌کم سفید می‌شود */}
            <Animated.View
                pointerEvents="none"
                style={[styles.headerBlock, { height: g.tabsStart, transform: [{ translateY: blockY }] }]}
            >
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: gradOpacity }]}>
                    <LinearGradient colors={[GRAD_TOP, WHITE]} style={StyleSheet.absoluteFill} />
                </Animated.View>
            </Animated.View>

            {/* تب‌ها: هم‌شیب اسکرول بالا می‌آیند و زیر هدر می‌ایستند */}
            <Animated.View style={[styles.tabs, { transform: [{ translateY: tabsY }] }]}>
                <View style={styles.tabsRow}>
                    {TABS.map((t, i) => (
                        <Pressable
                            key={t.key}
                            onPress={() => selectTab(i)}
                            style={styles.tabBtn}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: i === tab }}
                        >
                            <Text style={[styles.tabText, i === tab && styles.tabTextOn]}>{t.label}</Text>
                        </Pressable>
                    ))}
                </View>
                <Animated.View
                    style={[styles.indicator, { width: tabW, transform: [{ translateX: indicatorX }] }]}
                />
                {/* سایه نازک زیر تب‌ها وقتی به هدر چسبیده‌اند */}
                <Animated.View pointerEvents="none" style={[styles.tabsShadow, { opacity: shadowOpacity }]}>
                    <LinearGradient
                        colors={['rgba(17,24,39,0.14)', 'rgba(17,24,39,0)']}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            </Animated.View>

            {/* عنوان منبع: از پایین فضای خالی تا سمت راست هدر */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.title,
                    { maxWidth: (width - 40) / TITLE_SCALE },
                    { transform: [{ translateX: titleX }, { translateY: titleY }, { scale: titleScale }] },
                ]}
            >
                <Text style={styles.titleText} numberOfLines={1}>
                    {source.title}
                </Text>
            </Animated.View>

            {/* دکمه بازگشت (سمت راست هدر) */}
            <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                accessibilityLabel="بازگشت"
                style={[styles.back, { top: insets.top, height: HEADER_H }]}
            >
                <Ionicons name="chevron-forward" size={28} color={colors.text} />
            </Pressable>

            {/* لمس بیرون از منو، آن را می‌بندد */}
            {isWordsTab && menuOpen && (
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            )}

            {/* دکمه‌های یادگیری و آزمون فقط در تب واژه‌ها */}
            {isWordsTab && (
                <View style={styles.footer}>
                    <SplitButton
                        style={styles.flex}
                        title={deckCount > 0 ? `یادگیری (${deckCount} کلمه)` : 'یادگیری'}
                        disabled={unboxed === 0}
                        open={menuOpen}
                        onPress={() => {
                            setMenuOpen(false);
                            router.push(`/(session)/learn?id=${source.id}`);
                        }}
                        onToggle={() => setMenuOpen((o) => !o)}
                    />
                    <RoundIconButton
                        icon="extension-puzzle-outline"
                        size={56}
                        disabled={words.length === 0}
                        onPress={() => router.push(`/(session)/quiz?id=${source.id}`)}
                        accessibilityLabel="آزمون همه کلمات"
                    />
                </View>
            )}

            {isWordsTab && menuOpen && (
                <View style={styles.menu}>
                    {DECK_SIZE_OPTIONS.map((n) => {
                        const selected = n === deckSize;
                        return (
                            <Pressable
                                key={n}
                                style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]}
                                onPress={() => {
                                    setDeckSize(n);
                                    setMenuOpen(false);
                                }}
                            >
                                <Text style={[styles.menuText, selected && styles.menuTextOn]}>
                                    {`${n} کلمه`}
                                </Text>
                                {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 24 },

    // --- هدر / عنوان / تب‌ها ---
    headerBlock: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: WHITE },
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
        right: SIDE_PAD,
        height: TITLE_H,
        justifyContent: 'center',
        alignItems: 'flex-end',
        transformOrigin: 'right center',
    },
    titleText: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'right' },
    tabs: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: TABS_H,
        backgroundColor: WHITE,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    tabsShadow: { position: 'absolute', left: 0, right: 0, top: TABS_H, height: 6 },
    tabsRow: { flex: 1, flexDirection: 'row-reverse' },
    tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 15, fontWeight: '600', color: colors.sub },
    tabTextOn: { color: colors.text, fontWeight: '800' },
    indicator: { position: 'absolute', left: 0, bottom: 0, height: 3, backgroundColor: colors.text },

    // --- لیست ---
    list: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    rowBelow: { opacity: 0.45 }, // کلمه پایین‌تر از سطح که در جعبه نیست
    wordCol: { flex: 1, gap: 4 },
    en: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
    stars: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
    fa: { flex: 1, fontSize: 16, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },

    // --- فوتر ---
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: FOOTER_HEIGHT,
        paddingHorizontal: 20,
        backgroundColor: colors.bg,
    },
    menu: {
        position: 'absolute',
        left: 20,
        bottom: FOOTER_HEIGHT + 6,
        width: 160,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 6,
        zIndex: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuPressed: { backgroundColor: colors.bg },
    menuText: { fontSize: 16, color: colors.text },
    menuTextOn: { fontWeight: '800', color: colors.primary },
});