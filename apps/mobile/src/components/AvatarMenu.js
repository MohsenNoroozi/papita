import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import Avatar from './Avatar';

export default function AvatarMenu({ uri }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <>
            <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityLabel="منوی کاربر">
                <Avatar uri={uri} size={40} style={styles.ring} />
            </Pressable>

            <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
                {/* لمس بیرون از منو آن را می‌بندد */}
                <Pressable style={StyleSheet.absoluteFill} onPress={close}>
                    <View style={[styles.menu, { top: insets.top + 56 }]}>
                        <Pressable
                            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                            onPress={() => {
                                close();
                                router.push('/profile');
                            }}
                        >
                            <Text style={styles.itemText}>پروفایل</Text>
                            <Ionicons name="person-outline" size={20} color={colors.primary} />
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    ring: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
    menu: {
        position: 'absolute',
        right: 20,
        minWidth: 170,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 6,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    pressed: { backgroundColor: colors.bg },
    itemText: { fontSize: 16, color: colors.text },
});