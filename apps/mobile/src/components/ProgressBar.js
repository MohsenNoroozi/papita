import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function ProgressBar({ value }) {
    const v = useRef(new Animated.Value(value)).current;

    useEffect(() => {
        Animated.timing(v, { toValue: value, duration: 250, useNativeDriver: false }).start();
    }, [value, v]);

    const width = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={styles.track}>
            <Animated.View style={[styles.fill, { width }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
});