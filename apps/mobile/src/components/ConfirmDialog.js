import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import Button from './Button';

export default function ConfirmDialog({
                                          visible,
                                          icon = 'checkmark-done',
                                          title,
                                          message,
                                          confirmText = 'تأیید',
                                          cancelText = 'انصراف',
                                          onConfirm,
                                          onCancel,
                                      }) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onCancel}
        >
            {/* لمس پس‌زمینه = انصراف */}
            <Pressable style={styles.backdrop} onPress={onCancel}>
                {/* این Pressable جلوی رسیدن لمس داخل پنجره به پس‌زمینه را می‌گیرد */}
                <Pressable style={styles.card} onPress={() => {}}>
                    <View style={styles.iconWrap}>
                        <Ionicons name={icon} size={30} color={colors.primary} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    {message ? <Text style={styles.message}>{message}</Text> : null}

                    <View style={styles.actions}>
                        <Button title={confirmText} onPress={onConfirm} />
                        <Button title={cancelText} variant="ghost" onPress={onCancel} />
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: colors.card,
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: { fontSize: 19, fontWeight: '800', color: colors.text, textAlign: 'center', lineHeight: 28 },
    message: { fontSize: 15, color: colors.sub, textAlign: 'center', marginTop: 8 },
    actions: { alignSelf: 'stretch', marginTop: 24, gap: 4 },
});