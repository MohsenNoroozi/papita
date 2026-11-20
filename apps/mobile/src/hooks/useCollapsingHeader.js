import { useCallback, useMemo, useRef } from 'react';
import { Animated, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HEADER_H = 56;
export const TABS_H = 40;
export const SHADOW_H = 4;
export const TITLE_SCALE = 1.45;
export const BACK_RIGHT = 16; // فاصله دکمه back از لبه راست
export const BACK_W = 44;
const BACK_ICON = 28;
const TITLE_RIGHT = 20; // فاصله عنوان از لبه راست در حالت باز
const TITLE_GAP = 8; // فاصله عنوان تا آیکون back در حالت بسته
const TITLE_H = 40;
const TITLE_BOTTOM_GAP = 12;

// وقتی عنوان کنار آیکون back می‌ایستد، لبه راستش این‌قدر از لبه راست صفحه فاصله دارد
const TITLE_END_RIGHT = BACK_RIGHT + BACK_ICON + TITLE_GAP;
const TITLE_DX = TITLE_RIGHT - TITLE_END_RIGHT; // منفی = حرکت به چپ

export default function useCollapsingHeader(tabCount) {
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const scrollY = useRef(new Animated.Value(0)).current;
    const tabIndex = useRef(new Animated.Value(0)).current;

    const onScroll = useMemo(
        () => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
        [scrollY]
    );

    const animateToTab = useCallback(
        (i) => Animated.timing(tabIndex, { toValue: i, duration: 220, useNativeDriver: true }).start(),
        [tabIndex]
    );

    return useMemo(() => {
        const heroH = Math.round(height * 0.2);
        const headerBottom = insets.top + HEADER_H;
        const tabsStart = headerBottom + heroH;
        const tabsEnd = headerBottom;
        const tabsD = tabsStart - tabsEnd;
        const titleStart = tabsStart - TITLE_H - TITLE_BOTTOM_GAP;
        const titleEnd = insets.top + (HEADER_H - TITLE_H) / 2;
        const titleD = titleStart - titleEnd;
        const tabW = width / tabCount;
        const range = Array.from({ length: tabCount }, (_, i) => i);

        // gradient از بالای صفحه تا پایین تب‌ها؛ با اسکرول فشرده می‌شود تا پایین تب‌ها بماند
        const gradH = tabsStart + TABS_H;
        const gradEndScale = (headerBottom + TABS_H) / gradH;

        const clamp = (input, output) =>
            scrollY.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });

        return {
            insets,
            width,
            headerBottom,
            tabW,
            titleH: TITLE_H,
            gradH,
            onScroll,
            animateToTab,
            listTop: tabsStart + TABS_H + 10,
            listMinHeight: height + tabsD,
            scrollIndicatorTop: headerBottom + TABS_H,
            tabsY: clamp([0, tabsD], [tabsStart, tabsEnd]),
            titleY: clamp([0, titleD], [titleStart, titleEnd]),
            titleX: clamp([0, titleD], [0, TITLE_DX]),
            titleScale: clamp([0, titleD], [TITLE_SCALE, 1]),
            gradScaleY: clamp([0, tabsD], [1, gradEndScale]),
            // رنگ gradient محو می‌شود و زیرش سفید کامل دیده می‌شود
            gradOpacity: clamp([0, tabsD], [1, 0]),
            // سایه فقط در لحظه رسیدن تب‌ها به هدر ظاهر می‌شود
            shadowOpacity: clamp([Math.max(0, tabsD - 24), tabsD], [0, 1]),
            indicatorX: tabIndex.interpolate({
                inputRange: range,
                outputRange: range.map((i) => width - (i + 1) * tabW), // تب اول سمت راست
            }),
        };
    }, [height, width, insets, tabCount, scrollY, tabIndex, onScroll, animateToTab]);
}