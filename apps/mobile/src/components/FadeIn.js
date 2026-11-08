import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function FadeIn({ children, style }) {
    const v = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }, [v]);

    return (
        <Animated.View
            style={[
                style,
                { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
            ]}
        >
            {children}
        </Animated.View>
    );
}