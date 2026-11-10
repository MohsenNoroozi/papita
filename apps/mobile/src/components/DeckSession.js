import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useProgress } from '../context/ProgressContext';
import { useSettings } from '../context/SettingsContext';
import { applyAnswer, shuffle, REVIEW_DECK_SIZE } from '../leitner';
import { stopSpeaking } from '../speech';
import { colors } from '../theme';
import FlashCard from './FlashCard';
import FillIconTextButton from './FillIconTextButton';
import IconTextButton from './IconTextButton';
import LearnedAllDialog from './LearnedAllDialog';
import ProgressBar from './ProgressBar';
import ScreenHeader from './ScreenHeader';
import SwipeAway from './SwipeAway';

function formatDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m === 0 ? `${s} ثانیه` : `${m} دقیقه و ${s} ثانیه`;
}

/**
 * جلسه یادگیری/مرور یک دسته کلمه (کارت‌ها ← آمار ← دسته بعدی)
 *
 * mode: 'learn' | 'review'
 * pick(size, exclude): انتخاب غیرتصادفی کلمات دسته بعدی (size می‌تواند Infinity باشد)
 * quizHref(ids): آدرس آزمون همان دسته
 * onExit: دکمه «بازگشت» در آمار
 * renderEmpty(): صفحه‌ای که وقتی کلمه‌ای برای دسته نیست نمایش داده می‌شود
 */
export default function DeckSession({
                                        mode = 'learn',
                                        title,
                                        pick,
                                        quizHref,
                                        onExit,
                                        renderEmpty,
                                        showBack = true,
                                    }) {
    const router = useRouter();
    const isReview = mode === 'review';

    const { progress, getProgress, setEntry, addToBox1, removeFromBoxes, markSeen } = useProgress();
    const { autoSpeak, setAutoSpeak, deckSize } = useSettings();

    const used = useRef(new Set()); // مرور: کلماتی که در دسته‌های این نشست آمده‌اند

    const makeDeck = () => {
        // انتخاب دسته غیرتصادفی است؛ فقط ترتیب نمایش کارت‌ها تصادفی است.
        // مرور: اگر کلمات سررسیدشده بیش از ۱۰۰ تا باشند، در دسته‌های ۱۰۰تایی می‌آیند؛ وگرنه همه با هم.
        const size = isReview ? REVIEW_DECK_SIZE : deckSize;
        const d = shuffle(pick(size, isReview ? used.current : undefined));
        if (isReview) d.forEach((w) => used.current.add(w.id));
        return d;
    };

    const [deck, setDeck] = useState(makeDeck);
    const [idx, setIdx] = useState(0);
    const [phase, setPhase] = useState('cards'); // cards | stats
    const [tab, setTab] = useState('good'); // تب آمار: good = «در حافظه من»، rest = «نیاز به تمرین»
    const [enter, setEnter] = useState(null); // سمتی که کارت بعدی از آن وارد می‌شود
    const [deckKey, setDeckKey] = useState(0); // با هر دسته/ترتیب جدید، کارت دوباره ساخته می‌شود
    const [hasMoved, setHasMoved] = useState(false); // تا اولین تغییر کارت، تلفظ خودکار نداریم
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [elapsedMs, setElapsedMs] = useState(0);

    const startedAt = useRef(Date.now());
    const visited = useRef(new Set(deck.length > 0 ? [deck[0].id] : []));
    const flushed = useRef(false);
    const reviewLog = useRef({}); // مرور: { [id]: { original, known } }

    // ثبت کلمات دیده‌شده این دسته (فقط در یادگیری؛ یک بار برای هر دسته)
    const flushSeen = useCallback(() => {
        if (isReview || flushed.current) return;
        flushed.current = true;
        markSeen([...visited.current]);
    }, [isReview, markSeen]);

    useEffect(
        () => () => {
            stopSpeaking();
            flushSeen();
        },
        [flushSeen]
    );

    // مرور: کلمه‌ای که در این فاصله از جعبه‌ها حذف شده (مثلاً در صفحه یادگیری یا با پاک‌کردن پیشرفت)
    // نباید در دسته بماند
    useEffect(() => {
        if (!isReview) return;
        const alive = deck.filter((w) => progress[w.id]);
        if (alive.length === deck.length) return;
        setDeck(alive);
        setIdx((i) => Math.min(i, Math.max(alive.length - 1, 0)));
        setDeckKey((k) => k + 1); // کارت فعلی دوباره ساخته شود
    }, [isReview, deck, progress]);

    const applyNewDeck = (d) => {
        setDeck(d);
        visited.current = new Set([d[0].id]);
        flushed.current = false;
        startedAt.current = Date.now();
        setIdx(0);
        setEnter('left');
        setDeckKey((k) => k + 1);
        setTab('good');
        setPhase('cards');
    };

    // با هر بار برگشتن به این صفحه (مثلاً بعد از رفتن به تب دیگر) نشست از نو ساخته می‌شود
    const refresh = () => {
        flushSeen(); // یادگیری: کلمات دیده‌شده دسته قبلی ثبت شود
        if (isReview) {
            used.current = new Set(); // مرور: نشست تازه
            reviewLog.current = {};
        }
        const d = makeDeck();
        if (d.length > 0) {
            applyNewDeck(d);
            setEnter(null);
            setHasMoved(false); // مثل باز شدن تازه صفحه: کلمه اول خوانده نمی‌شود
        } else {
            setDeck([]); // کلمه‌ای نمانده
        }
    };

    // برای افکت فوکوس (که فقط یک‌بار ساخته می‌شود) آخرین نسخه refresh را نگه می‌داریم
    const latest = useRef({});
    latest.current = { refresh };

    const firstFocus = useRef(true); // اولین فوکوس = ساخته‌شدن صفحه، refresh نمی‌خواهد
    const skipRefresh = useRef(false); // برگشت از آزمونی که خودمان باز کرده‌ایم، refresh نمی‌خواهد

    useFocusEffect(
        useCallback(() => {
            if (firstFocus.current) {
                firstFocus.current = false;
                return;
            }
            if (skipRefresh.current) {
                skipRefresh.current = false;
                return;
            }
            latest.current.refresh();
        }, [])
    );

    // رفتن به آزمون؛ برگشت از آن دسته را refresh نمی‌کند
    const openQuiz = (href) => {
        skipRefresh.current = true;
        router.push(href);
    };

    // ---------- کارها ----------
    // رفتن به یک کارت دیگر؛ from = سمتی که کارت جدید از آن وارد می‌شود
    const goTo = (nextIdx, from, list = deck) => {
        visited.current.add(list[nextIdx].id);
        setEnter(from);
        setIdx(nextIdx);
        setHasMoved(true);
    };

    // پایان دسته: نمایش آمار
    const finishDeck = () => {
        flushSeen();
        setElapsedMs(Date.now() - startedAt.current);
        setTab('good');
        setEnter('left');
        setPhase('stats');
    };

    const advance = () => {
        if (idx === deck.length - 1) finishDeck();
        else goTo(idx + 1, 'left');
    };

    // مرور: ثبت پاسخ (همیشه از وضعیت اولیه حساب می‌شود، پس تغییر پاسخ مشکلی ندارد)
    const applyReview = (w, known) => {
        if (!getProgress()[w.id]) return; // کلمه‌ای که دیگر در جعبه نیست دوباره به جعبه اضافه نشود
        const log = reviewLog.current;
        if (!log[w.id]) log[w.id] = { original: getProgress()[w.id] };
        log[w.id].known = known;
        setEntry(w.id, applyAnswer(log[w.id].original, known));
    };

    // راست = بعدی (از چپ وارد می‌شود؛ بعد از آخرین کلمه: آمار)، چپ = قبلی (از راست وارد می‌شود)
    const handleSwipe = (toRight) => {
        if (toRight) advance();
        else goTo(Math.max(idx - 1, 0), 'right');
    };

    // بالا. یادگیری: اگر در جعبه نیست به جعبه ۱ برود. مرور: «بلد بودم» (یک جعبه جلو)
    const handleSwipeUp = () => {
        const w = deck[idx];
        if (isReview) applyReview(w, true);
        else if (!getProgress()[w.id]) addToBox1([w.id]);
        advance();
    };

    // پایین. یادگیری: از جعبه‌ها حذف شود. مرور: «بلد نبودم» (برگشت به جعبه ۱)
    const handleSwipeDown = () => {
        const w = deck[idx];
        if (isReview) applyReview(w, false);
        else if (getProgress()[w.id]) removeFromBoxes([w.id]);
        advance();
    };

    // ترتیب تصادفی جدید برای همین دسته و رفتن به اولین کارت
    const reshuffle = () => {
        const next = shuffle(deck);
        setDeck(next);
        setDeckKey((k) => k + 1);
        goTo(0, 'left', next);
    };

    const confirmLearnedAll = () => {
        const p = getProgress();
        addToBox1(deck.filter((w) => !p[w.id]).map((w) => w.id));
        setConfirmOpen(false);
    };

    const toggleAutoSpeak = () => {
        if (autoSpeak) stopSpeaking();
        setAutoSpeak(!autoSpeak);
    };

    // از آمار با کشیدن از راست به چپ به آخرین کلمه برمی‌گردیم (از راست وارد می‌شود)
    const backToLast = () => {
        setEnter('right');
        setIdx(deck.length - 1);
        setPhase('cards');
    };

    const nextDeck = () => {
        const d = makeDeck();
        if (d.length > 0) applyNewDeck(d);
    };

    // مرور مجدد: همین دسته از اول، با ترتیب تصادفی جدید
    const reviewAgain = () => {
        setDeck(shuffle(deck));
        startedAt.current = Date.now();
        setIdx(0);
        setEnter('left');
        setDeckKey((k) => k + 1);
        setTab('good');
        setPhase('cards');
    };

    // ---------- کلمه‌ای برای دسته نیست ----------
    if (deck.length === 0) return renderEmpty ? renderEmpty() : null;

    const word = deck[idx];
    const entry = progress[word.id];
    const quizDeckHref = quizHref(deck.map((w) => w.id));

    // ---------- آمار پایان دسته ----------
    if (phase === 'stats') {
        const good = deck.filter((w) =>
            isReview ? reviewLog.current[w.id]?.known === true : !!progress[w.id]
        );
        const rest = deck.filter((w) => !good.includes(w));
        const list = tab === 'good' ? good : rest;
        const remaining = pick(Infinity, isReview ? used.current : undefined).length;

        return (
            <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
                <ScreenHeader title={title} showBack={showBack} />

                <SwipeAway direction="left" enterFrom="left" onDismiss={backToLast} style={styles.flex}>
                    <View style={styles.statsTop}>
                        <Text style={styles.statsTitle}>🎉 این دسته تمام شد</Text>

                        <View style={styles.timeCard}>
                            <Ionicons name="stopwatch" size={28} color={colors.primary} />
                            <Text style={styles.timeValue}>{formatDuration(elapsedMs)}</Text>
                        </View>

                        <View style={styles.tabs}>
                            <Pressable
                                onPress={() => setTab('good')}
                                style={[
                                    styles.tab,
                                    tab === 'good' && { backgroundColor: colors.successSoft, borderColor: colors.success },
                                ]}
                            >
                                <View style={styles.tabTop}>
                                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                                    <Text style={[styles.tabNum, { color: colors.success }]}>{good.length}</Text>
                                </View>
                                <Text style={styles.tabLabel}>در حافظه من</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => setTab('rest')}
                                style={[
                                    styles.tab,
                                    tab === 'rest' && { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
                                ]}
                            >
                                <View style={styles.tabTop}>
                                    <Ionicons name="barbell" size={22} color={colors.danger} />
                                    <Text style={[styles.tabNum, { color: colors.danger }]}>{rest.length}</Text>
                                </View>
                                <Text style={styles.tabLabel}>نیاز به تمرین</Text>
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView style={styles.flex} contentContainerStyle={styles.listContent}>
                        {list.length === 0 ? (
                            <Text style={styles.emptyList}>
                                {tab === 'good' ? 'هنوز کلمه‌ای در حافظه‌ات نیست' : 'نیازی به تمرین نیست 🎉'}
                            </Text>
                        ) : (
                            list.map((w) => (
                                <View key={w.id} style={styles.row}>
                                    <Text style={styles.rowEn}>{w.en}</Text>
                                    <Text style={styles.rowFa}>{w.fa}</Text>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.actionsRow}>
                        <IconTextButton
                            icon="play-skip-forward-outline"
                            label="دسته بعدی"
                            filled
                            disabled={remaining === 0}
                            onPress={nextDeck}
                        />
                        <IconTextButton icon="refresh-outline" label="مرور مجدد" onPress={reviewAgain} />
                        <IconTextButton
                            icon="extension-puzzle-outline"
                            label="آزمون"
                            onPress={() => openQuiz(quizDeckHref)}
                        />
                        <IconTextButton icon="arrow-back-outline" label="بازگشت" onPress={onExit} />
                    </View>
                </SwipeAway>
            </SafeAreaView>
        );
    }

    // ---------- کارت‌های دسته ----------
    const unadded = deck.filter((w) => !progress[w.id]); // کلمات این دسته که هنوز در جعبه نیستند
    const ratio = (deck.length - unadded.length) / deck.length;

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <ScreenHeader
                title={title}
                showBack={showBack}
                right={<Text style={styles.counter}>{`${idx + 1} / ${deck.length}`}</Text>}
            />
            <View style={styles.bar}>
                <ProgressBar value={(idx + 1) / deck.length} />
            </View>

            <View style={styles.cardArea}>
                <FlashCard
                    key={`${deckKey}-${word.id}`}
                    word={word}
                    onSwipe={handleSwipe}
                    onSwipeUp={handleSwipeUp}
                    onSwipeDown={handleSwipeDown}
                    allowLeft={idx > 0}
                    easySwipe
                    enterFrom={enter}
                    tint={false}
                    showExample
                    showBox
                    box={entry?.box}
                    autoPlay={autoSpeak && hasMoved}
                />
            </View>

            <View style={styles.footer}>
                <IconTextButton icon="shuffle" label="تصادفی" onPress={reshuffle} />

                {!isReview && (
                    <FillIconTextButton
                        icon="rocket-outline"
                        label="یاد گرفتم"
                        ratio={ratio}
                        disabled={unadded.length === 0}
                        onPress={() => setConfirmOpen(true)}
                    />
                )}

                <IconTextButton
                    icon="extension-puzzle-outline"
                    label="آزمون"
                    onPress={() => openQuiz(quizDeckHref)}
                />

                <IconTextButton
                    icon={autoSpeak ? 'volume-high-outline' : 'volume-mute-outline'}
                    label="تلفظ"
                    muted={!autoSpeak}
                    accessibilityState={{ selected: autoSpeak }}
                    onPress={toggleAutoSpeak}
                />
            </View>

            {!isReview && (
                <LearnedAllDialog
                    visible={confirmOpen}
                    total={deck.length}
                    remaining={unadded.length}
                    onConfirm={confirmLearnedAll}
                    onCancel={() => setConfirmOpen(false)}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    counter: { fontSize: 15, color: colors.sub },
    bar: { paddingHorizontal: 24, marginTop: 4 },
    cardArea: { flex: 1, justifyContent: 'center' },
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 0,
    },

    // آمار
    statsTop: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
    statsTitle: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
    timeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.card,
        borderRadius: 18,
        paddingVertical: 14,
    },
    timeValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    tabs: { flexDirection: 'row', gap: 12 },
    tab: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
        paddingVertical: 10,
    },
    tabTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tabNum: { fontSize: 26, fontWeight: '800' },
    tabLabel: { fontSize: 13, color: colors.sub },
    listContent: { padding: 20, gap: 8 },
    emptyList: { textAlign: 'center', fontSize: 15, color: colors.sub, marginTop: 16 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    rowEn: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'left' },
    rowFa: { flex: 1, fontSize: 15, color: colors.sub, textAlign: 'right', writingDirection: 'rtl' },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 0,
    },
});