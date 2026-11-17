import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarInsetProvider } from '@/context/BarInsetContext';
import { colors } from '@/theme';
import { BlurView, BlurTargetView } from 'expo-blur';

const ITEMS = [
    { key: 'home', href: '/', title: 'خانه', icon: 'home-outline', iconOn: 'home' },
    { key: 'source', href: '/source', title: 'منابع', icon: 'library-outline', iconOn: 'library' },
];

const ITEM_HEIGHT = 52;
const PADDING = 4;
const BAR_HEIGHT = ITEM_HEIGHT + PADDING * 2;
const BOTTOM_GAP = 8; // فاصله نوار تا لبه پایین (علاوه بر safe area)
const CONTENT_GAP = 8; // فاصله محتوا تا نوار

function activeIndexOf(path) {
    if (path === '/' || path === '') return 0;
    if (path.startsWith('/source')) return 1; // شامل /source/[id] و /source/box/[key]
    return -1;
}

function BarItem({ item, focused, onPress }) {
    const scale = useRef(new Animated.Value(focused ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(scale, { toValue: focused ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true }).start();
    }, [focused, scale]);

    const color = focused ? colors.barActive : colors.barInactive;
    const iconScale = scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="link"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: focused }}
            style={({ pressed }) => [styles.item, pressed && !focused && styles.itemPressed]}
        >
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                <Ionicons name={focused ? item.iconOn : item.icon} size={22} color={color} />
            </Animated.View>
            <Text style={[styles.label, { color }, focused && styles.labelOn]} numberOfLines={1}>
                {item.title}
            </Text>
        </Pressable>
    );
}

function FloatingBar({ active, bottom }) {
    const router = useRouter();
    const [innerWidth, setInnerWidth] = useState(0);
    const x = useRef(new Animated.Value(0)).current;
    const visible = useRef(new Animated.Value(active >= 0 ? 1 : 0)).current;
    const itemWidth = innerWidth / ITEMS.length;

    const targetRef = useRef(null);

    useEffect(() => {
        if (!itemWidth) return;
        Animated.parallel([
            Animated.spring(x, { toValue: Math.max(active, 0) * itemWidth, friction: 9, tension: 90, useNativeDriver: true }),
            Animated.timing(visible, { toValue: active >= 0 ? 1 : 0, duration: 150, useNativeDriver: true }),
        ]).start();
    }, [active, itemWidth, x, visible]);

    return (
        <View style={[styles.floating, { bottom }]} pointerEvents="box-none">
            {/* سایه روی لایه‌ی بیرونی؛ بلور باید داخل لایه‌ای با overflow: hidden باشد */}
            <View style={styles.shadowWrap}>
                <View style={styles.glass}>
                    <BlurView
                        blurTarget={targetRef}
                        intensity={95}
                        tint="systemChromeMaterialLight"
                        blurMethod="dimezisBlurView"
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.glassTint} pointerEvents="none" />

                    <BlurTargetView ref={targetRef} style={styles.inner} onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width)}>
                        {itemWidth > 0 && (
                            <Animated.View
                                pointerEvents="none"
                                style={[styles.indicator, { width: itemWidth, opacity: visible, transform: [{ translateX: x }] }]}
                            />
                        )}
                        {ITEMS.map((item, i) => (
                            <BarItem key={item.key} item={item} focused={active === i} onPress={() => router.navigate(item.href)} />
                        ))}
                    </BlurTargetView>
                </View>
            </View>
        </View>
    );
}

export default function AppLayout() {
    const insets = useSafeAreaInsets();
    const path = usePathname();
    const [keyboard, setKeyboard] = useState(false);

    useEffect(() => {
        const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
        const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const showBar = !keyboard;
    const bottom = insets.bottom + BOTTOM_GAP;
    const inset = showBar ? BAR_HEIGHT + bottom + CONTENT_GAP : 0;

    return (
        <BarInsetProvider value={inset}>
            <View style={styles.root}>
                <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: colors.bg } }} />
                {showBar && <FloatingBar active={activeIndexOf(path)} bottom={bottom} />}
            </View>
        </BarInsetProvider>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    floating: { position: 'absolute', left: 28, right: 28 },
    shadowWrap: {
        borderRadius: 30,
        shadowColor: colors.barShadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 2,
    },
    glass: {
        borderRadius: 30,
        overflow: 'hidden',
        padding: PADDING,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: colors.barBorder,
    },
    glassTint: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.barGlass },
    inner: { flexDirection: 'row', height: ITEM_HEIGHT },
    indicator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        borderRadius: 26,
        backgroundColor: colors.barActiveBg,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
    itemPressed: { backgroundColor: colors.barPressed },
    label: { fontSize: 11, fontWeight: '600' },
    labelOn: { fontWeight: '800' },
});
