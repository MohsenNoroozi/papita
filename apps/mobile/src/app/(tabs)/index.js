import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Pressable,
    Image,
    StatusBar,
    Dimensions,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { useProfile } from '@/context/ProfileContext';
import { getDueWords, countBoxes } from '@/leitner';
import BoxesOverview from '@/components/BoxesOverview';
import { colors } from '@/theme';
import Button from '@/components/Button';
import { inspectStorage } from '@/storage';
import Avatar from "@/components/Avatar";
import {useBarInset} from "@/context/BarInsetContext";


// عکس پس‌زمینه (Unsplash، گرادیان آبی تیره به بنفش، رایگان)
// برای پایداری بیشتر می‌توانید آن را دانلود و در assets بگذارید و با require() جایگزین کنید
const HERO_IMAGE = {
    uri: 'https://unsplash.com/photos/hQo6Uyo4nBg/download?force=true&w=1080',
};
const HERO_FALLBACK = '#3b2f8f'; // اگر عکس لود نشد، این رنگ دیده می‌شود
const OVERLAP = 104; // مقداری از کارت‌ها که روی بک‌گراند می‌افتد
const { height } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(300, height * 0.4);

export default function Home() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { words, refresh: refreshCatalog } = useCatalog();
    const { refresh: refreshProfile } = useProfile();
    const { level } = useSettings();
    const { profile } = useProfile();
    const { ready, progress, reset, shiftDays, syncNow } = useProgress();
    const [refreshing, setRefreshing] = useState(false);
    const printStorage = () => inspectStorage();
    const barInset = useBarInset();

    // متن نوار وضعیت روی عکس تیره باید روشن باشد
    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('light-content', true);
            return () => StatusBar.setBarStyle('dark-content', true);
        }, [])
    );

    const stats = useMemo(() => {
        const boxes = countBoxes(words, progress, level);
        return {
            due: getDueWords(words, progress).length, // مرور: بدون فیلتر سطح
            fresh: boxes.fresh,
            boxes,
        };
    }, [words, progress, level]);

    if (!ready) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const refreshAll = async () => {
        if (refreshing) return;
        setRefreshing(true);
        const [p, c, u] = await Promise.all([syncNow(), refreshCatalog(), refreshProfile()]);
        setRefreshing(false);
        if (!p || !c || !u) {
            Alert.alert('به‌روزرسانی نشد', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کن.');
        }
    };

    return (
        <View style={styles.screen}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: 8 + barInset }]}
            >
                <View style={styles.heroWrap}>
                    <View style={[styles.hero]}>
                        <Image
                            source={HERO_IMAGE}
                            resizeMode="cover"
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.tint} pointerEvents="none" />
                        {/* دایره‌های تزئینی */}
                        <View style={[styles.bubble, styles.bubbleA]} pointerEvents="none" />
                        <View style={[styles.bubble, styles.bubbleB]} pointerEvents="none" />
                        <View style={[styles.bubble, styles.bubbleC]} pointerEvents="none" />

                        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                            <Pressable
                                onPress={refreshAll}
                                disabled={refreshing}
                                hitSlop={10}
                                accessibilityLabel="به‌روزرسانی از سرور"
                                style={styles.refreshBtn}
                            >
                                {refreshing ? <ActivityIndicator color="#fff" /> : <Ionicons name="refresh" size={22} color="#fff" />}
                            </Pressable>
                            <Pressable onPress={() => router.push('/profile')} hitSlop={8}>
                                <Avatar uri={profile?.avatar_url} size={40} style={styles.ring} />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* ---------- دو کارت کنار هم: نیمی روی عکس، نیمی پایین آن ---------- */}
                <View style={styles.cardsRow}>
                    <View style={styles.card}>
                        <View style={styles.cardHead}>
                            <View style={styles.badge}>
                                <Ionicons name="repeat" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.headText}>
                                <Text style={styles.cardLabel}>مرور</Text>
                                <Text style={styles.big}>{stats.due}</Text>
                            </View>
                        </View>
                        <Text style={styles.cardSub} numberOfLines={2}>
                            {stats.due > 0 ? 'کلمه آماده مرور' : 'امروز مرور نداری'}
                        </Text>
                        <Button
                            title="شروع"
                            disabled={stats.due === 0}
                            onPress={() => router.push('/(review)/review')}
                            style={styles.cardBtn}
                        />
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHead}>
                            <View style={styles.badge}>
                                <Ionicons name="sparkles" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.headText}>
                                <Text style={styles.cardLabel}>یادگیری</Text>
                                <Text style={styles.big}>{stats.fresh}</Text>
                            </View>
                        </View>
                        <Text style={styles.cardSub} numberOfLines={2}>
                            {stats.fresh > 0 ? 'کلمه جدید منتظر توست' : 'همه را یاد گرفتی 🎉'}
                        </Text>
                        <Button
                            title="شروع"
                            disabled={stats.fresh === 0}
                            onPress={() => router.push('/(session)/learn')}
                            style={styles.cardBtn}
                        />
                    </View>
                </View>

                {/* ---------- پایین: آمار ---------- */}
                <View style={styles.body}>
                    <View style={styles.boxesSection}>
                        <Text style={styles.boxesTitle}>جعبه‌های من</Text>
                        <BoxesOverview
                            fresh={stats.boxes.fresh}
                            counts={stats.boxes.counts}
                            mastered={stats.boxes.mastered}
                            onSelect={(key) => router.push(`/source/box/${key}`, {
                                withAnchor: true,
                            })}
                        />
                    </View>

                    {__DEV__ && (
                        <View style={styles.dev}>
                            <Text style={styles.devTitle}>ابزار تست (فقط حالت توسعه)</Text>
                            <Pressable onPress={() => shiftDays(1)}>
                                <Text style={styles.devLink}>⏩ یک روز جلو ببر</Text>
                            </Pressable>
                            <Pressable onPress={reset}>
                                <Text style={styles.devLink}>🗑 پاک کردن همه پیشرفت</Text>
                            </Pressable>
                            <Pressable onPress={printStorage}>
                                <Text style={styles.devLink}>مشاهده داده‌ها</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    content: { paddingBottom: 28 },

    // --- hero ---
    heroWrap: {
        height: HERO_HEIGHT,
        backgroundColor: HERO_FALLBACK,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
    },
    ring: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
    hero: { flex: 1, position: 'relative', overflow: 'hidden', paddingHorizontal: 24, paddingBottom: OVERLAP + 16 },
    tint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24, 14, 70, 0.30)' },
    bubble: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.10)' },
    bubbleA: { width: 180, height: 180, borderRadius: 90, top: -50, left: -60 },
    bubbleB: { width: 90, height: 90, borderRadius: 45, top: 90, right: -30 },
    bubbleC: { width: 56, height: 56, borderRadius: 28, bottom: OVERLAP + 40, left: 40 },
    hello: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textAlign: 'right' },
    title: {
        fontSize: 42,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'right',
        marginTop: 2,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowRadius: 8,
        textShadowOffset: { width: 0, height: 2 },
    },
    date: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 2 },

    // --- cards ---
    cardsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: -OVERLAP,
    },
    card: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 16,
        shadowColor: '#1b1050',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    badge: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headText: { alignItems: 'flex-end' },
    cardLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, textAlign: 'right' },
    big: { fontSize: 36, fontWeight: '800', color: colors.text, textAlign: 'right', lineHeight: 42 },
    cardSub: { fontSize: 13, color: colors.sub, textAlign: 'right', marginTop: 4, marginBottom: 10, minHeight: 36 },
    cardBtn: { alignSelf: 'stretch', height: 36, minHeight: 0, paddingVertical: 0 },

    // --- body ---
    body: { paddingHorizontal: 20, paddingTop: 18, gap: 12 },
    stat: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 16, alignItems: 'center', gap: 2 },
    boxesSection: { gap: 8 },
    boxesTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' },

    dev: {
        marginTop: 4,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: colors.border,
        gap: 8,
    },
    devTitle: { fontSize: 12, color: colors.sub },
    devLink: { fontSize: 15, color: colors.primary },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 100000,
    },
    refreshBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
