import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';

import { colors } from '@/theme';
import DotProgressBar from './DotProgressBar';

// مثل قدم «معرفی»: کشیدن به راست = کارت بعدی، کشیدن به چپ = کارت قبلی (۱ = راست، -۱ = چپ)
const NEXT_DIR = 1;
const SWIPE_DISTANCE = 70;
const FLICK_VELOCITY = 0.3;

/**
 * کارتِ قابل‌کشیدن با نوار نقطه‌ای بالا.
 * count / index: تعداد صفحه‌ها (کارت‌ها + صفحه پایانی) و صفحه فعلی (کنترل‌شده توسط والد)
 * dotCount: تعداد نقطه‌های نوار بالا (پیش‌فرض = count). صفحه پایانی نقطه ندارد.
 * onChange(i): هنگام رفتن به کارت دیگر (وسط انیمیشن) صدا زده می‌شود
 * ref.goTo(i): رفتن برنامه‌ای به یک کارت (با انیمیشن)
 * children: محتوای کارت فعلی
 */
const SwipeCards = forwardRef(function SwipeCards({ count, dotCount, index, onChange, children, style }, ref) {
    const { width } = useWindowDimensions();
    const x = useRef(new Animated.Value(0)).current;
    const busy = useRef(false);

    // آخرین propها برای PanResponder و ref (که فقط یک‌بار ساخته می‌شوند)
    const latest = useRef({});
    latest.current = { count, index, onChange, width };

    const dots = dotCount ?? count;

    const springBack = () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();

    // کارت فعلی به سمت dir خارج می‌شود و کارت جدید از سمت مخالف وارد می‌شود
    const animateTo = (next, dir) => {
        if (busy.current) return;
        busy.current = true;
        const w = latest.current.width;
        Animated.timing(x, { toValue: dir * w, duration: 180, useNativeDriver: true }).start(() => {
            latest.current.onChange(next);
            x.setValue(-dir * w);
            Animated.timing(x, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(() => {
                busy.current = false;
            });
        });
    };

    const goTo = (i) => {
        const { count: c, index: cur } = latest.current;
        if (i === cur || i < 0 || i >= c) return;
        animateTo(i, i > cur ? NEXT_DIR : -NEXT_DIR);
    };

    const swipe = (dir) => {
        const { count: c, index: cur } = latest.current;
        const next = cur + (dir === NEXT_DIR ? 1 : -1);
        if (next < 0 || next >= c) return springBack();
        animateTo(next, dir);
    };

    useImperativeHandle(ref, () => ({ goTo }), []); // eslint-disable-line react-hooks/exhaustive-deps

    const swipeRef = useRef(swipe);
    swipeRef.current = swipe;

    const responder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                !busy.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
            onPanResponderMove: (_, g) => x.setValue(g.dx),
            onPanResponderRelease: (_, g) => {
                const flick = Math.abs(g.vx) > FLICK_VELOCITY && Math.abs(g.dx) > 20;
                if (Math.abs(g.dx) > SWIPE_DISTANCE || flick) swipeRef.current(Math.sign(g.dx));
                else springBack();
            },
            onPanResponderTerminate: springBack,
        })
    ).current;

    const rotate = x.interpolate({
        inputRange: [-width, 0, width],
        outputRange: ['-8deg', '0deg', '8deg'],
    });

    return (
        <>
            <DotProgressBar
                count={dots}
                index={Math.min(index, dots - 1)}
                onSelect={goTo}
            />
            <Animated.View
                {...responder.panHandlers}
                style={[styles.card, style, { transform: [{ translateX: x }, { rotate }] }]}
            >
                {children}
            </Animated.View>
        </>
    );
});

export default SwipeCards;

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 28,
        padding: 20,
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
});