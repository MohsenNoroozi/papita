import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Pressable,
    ImageBackground,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { WORDS } from '../../data/words';
import { useProgress } from '../../context/ProgressContext';
import { getDueWords, getNewWords, MASTERED, INTERVALS_DAYS } from '../../leitner';
import { colors } from '../../theme';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import { inspectStorage } from '../../storage';

// عکس پس‌زمینه (Unsplash، گرادیان آبی تیره به بنفش، رایگان)
// برای پایداری بیشتر می‌توانید آن را دانلود و در assets بگذارید و با require() جایگزین کنید
const HERO_IMAGE = {
    uri: 'https://unsplash.com/photos/hQo6Uyo4nBg/download?force=true&w=1080',
};
const HERO_FALLBACK = '#3b2f8f'; // اگر عکس لود نشد، این رنگ دیده می‌شود
const OVERLAP = 104; // مقداری از کارت‌ها که روی بک‌گراند می‌افتد
const { height } = Dimensions.get('window');
const HERO_HEIGHT = Math.max(300, height * 0.4);

function greeting() {
    const h = new Date().getHours();
    if (h < 11) return 'صبح بخیر';
    if (h < 16) return 'روز بخیر';
    if (h < 20) return 'عصر بخیر';
    return 'شب بخیر';
}

function todayLabel() {
    try {
        return new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
        return '';
    }
}

export default function Home() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { ready, progress, reset, shiftDays } = useProgress();
    const printStorage = () => inspectStorage();

    // متن نوار وضعیت روی عکس تیره باید روشن باشد
    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('light-content', true);
            return () => StatusBar.setBarStyle('dark-content', true);
        }, [])
    );

    const stats = useMemo(() => {
        const entries = Object.values(progress);
        const mastered = entries.filter((e) => e.box === MASTERED).length;

        // پیشرفت کلی = یادگیری + مرور:
        // کلمه‌ای که هنوز در جعبه نیست ۰ امتیاز دارد، ورود به جعبه ۱ اولین قدم است،
        // و هر بار که با مرور موفق به جعبه بالاتر می‌رود امتیازش بیشتر می‌شود تا ۱ (کاملاً یادگرفته).
        const steps = INTERVALS_DAYS.length + 1;
        const score = entries.reduce(
            (sum, e) => sum + (e.box === MASTERED ? 1 : Math.min(e.box, steps) / steps),
            0
        );

        return {
            due: getDueWords(WORDS, progress).length,
            fresh: getNewWords(WORDS, progress).length,
            learning: entries.length - mastered,
            mastered,
            boxed: entries.length,
            overall: WORDS.length ? Math.min(1, score / WORDS.length) : 0,
        };
    }, [progress]);

    const dateText = useMemo(todayLabel, []);

    if (!ready) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                {/* ---------- بالا: عکس پس‌زمینه ---------- */}
                <View style={styles.heroWrap}>
                    <ImageBackground
                        source={HERO_IMAGE}
                        resizeMode="cover"
                        style={[styles.hero, { paddingTop: insets.top + 18 }]}
                    >
                        <View style={styles.tint} pointerEvents="none" />
                        {/* دایره‌های تزئینی */}
                        <View style={[styles.bubble, styles.bubbleA]} pointerEvents="none" />
                        <View style={[styles.bubble, styles.bubbleB]} pointerEvents="none" />
                        <View style={[styles.bubble, styles.bubbleC]} pointerEvents="none" />

                        <Text style={styles.hello}>{greeting()} 👋</Text>
                        <Text style={styles.title}>امروز</Text>
                        {!!dateText && <Text style={styles.date}>{dateText}</Text>}
                    </ImageBackground>
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
                            onPress={() => router.navigate('/review')}
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
                            onPress={() => router.navigate('/source')}
                            style={styles.cardBtn}
                        />
                    </View>
                </View>

                {/* ---------- پایین: آمار ---------- */}
                <View style={styles.body}>
                    <View style={styles.progressCard}>
                        <View style={styles.progressTop}>
                            <Text style={styles.progressTitle}>پیشرفت کلی</Text>
                            <Text style={styles.progressPct}>{Math.round(stats.overall * 100)}%</Text>
                        </View>
                        <ProgressBar value={stats.overall} />
                        <Text style={styles.progressHint}>
                            شامل یادگیری کلمات جدید و ارتقای آن‌ها با مرور
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="school-outline" size={22} color={colors.primary} />
                            <Text style={styles.statNum}>{stats.learning}</Text>
                            <Text style={styles.statLabel}>در حال یادگیری</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="trophy-outline" size={22} color={colors.primary} />
                            <Text style={styles.statNum}>{stats.mastered}</Text>
                            <Text style={styles.statLabel}>کاملاً یادگرفته</Text>
                        </View>
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
    hero: { flex: 1, paddingHorizontal: 24, paddingBottom: OVERLAP + 16 },
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
    progressCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 10 },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    progressHint: { fontSize: 12, color: colors.sub, textAlign: 'right' },
    progressPct: { fontSize: 15, fontWeight: '800', color: colors.primary },
    statsRow: { flexDirection: 'row', gap: 12 },
    stat: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 16, alignItems: 'center', gap: 2 },
    statNum: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
    statLabel: { fontSize: 13, color: colors.sub },
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
});