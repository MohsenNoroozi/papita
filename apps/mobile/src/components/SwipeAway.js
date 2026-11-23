import React, {useEffect, useRef} from 'react';
import {Animated, Dimensions, Easing, PanResponder} from 'react-native';

const { width } = Dimensions.get('window');
const DISMISS_DISTANCE = width * 0.25;

// با کشیدن افقی در جهت direction ('left' یا 'right') کنار می‌رود و onDismiss صدا زده می‌شود.
// direction='left' یعنی کشیدن از راست به چپ.
// enterFrom ('left' | 'right') = سمتی که با انیمیشن از آن وارد می‌شود.
export default function SwipeAway({
                                      children,
                                      onDismiss,
                                      direction = 'right',
                                      enterFrom = null,
                                      style,
                                  }) {
    const sign = direction === 'left' ? -1 : 1;
    const startX = enterFrom === 'left' ? -width : enterFrom === 'right' ? width : 0;
    const x = useRef(new Animated.Value(startX)).current;
    const onDismissRef = useRef(onDismiss);
    onDismissRef.current = onDismiss;

    useEffect(() => {
        if (!enterFrom) return;
        Animated.timing(x, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const springBack = () => {
        Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
    };

    const responder = useRef(
        PanResponder.create({
            // فقط حرکت واضحاً افقی در جهت مورد نظر را از اسکرول می‌گیرد
            onMoveShouldSetPanResponderCapture: (_, g) => {
                return g.dx * sign > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2;
            },
            onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx * sign) * sign),
            onPanResponderRelease: (_, g) => {
                const dist = g.dx * sign;
                if (dist > DISMISS_DISTANCE || (g.vx * sign > 0.5 && dist > 30)) {
                    Animated.timing(x, {
                        toValue: sign * width,
                        duration: 200,
                        useNativeDriver: false,
                    }).start(() => onDismissRef.current?.());
                } else {
                    springBack();
                }
            },
            onPanResponderTerminate: springBack,
        })
    ).current;

    return (
        <Animated.View
            {...responder.panHandlers}
            style={[style, { transform: [{ translateX: x }] }]}
        >
            {children}
        </Animated.View>
    );
}