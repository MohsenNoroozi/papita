import React, { useCallback, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { colors } from '@/theme';
import useCollapsingHeader from '@/hooks/useCollapsingHeader';
import useSelection from '@/hooks/useSelection';
import useSourceWords from '@/hooks/useSourceWords';
import CollapsingHeader from '@/components/CollapsingHeader';
import ScreenHeader from '@/components/ScreenHeader';
import SelectionBar from '@/components/SelectionBar';
import FloatingBar, { useFloatingBarSpace } from '@/components/FloatingBar';
import DeckSizeMenu from '@/components/DeckSizeMenu';
import WordRow from '@/components/WordRow';

const TABS = [
    { key: 'words', label: 'واژه‌ها' },
    { key: 'videos', label: 'ویدئوها' },
    { key: 'sounds', label: 'صداها' },
];
const NO_ITEMS = [];
const keyExtractor = (r) => String(r.id);

export default function SourceScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const sourceId = Number(id);
    const { getSource, getWordsOfSource } = useCatalog();
    const source = getSource(sourceId);
    const words = useMemo(() => getWordsOfSource(sourceId), [getWordsOfSource, sourceId]);

    const { progress } = useProgress();
    const { deckSize, setDeckSize, level } = useSettings();
    const [tab, setTab] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);

    const header = useCollapsingHeader(TABS.length);
    const sel = useSelection();
    const { items, byId, dueCount, learnableCount } = useSourceWords(words, progress, level);

    const { clear: clearSelection, toggle, selectAll } = sel;

    // با ترک صفحه، منو بسته و انتخاب‌ها پاک شود
    useFocusEffect(
        useCallback(
            () => () => {
                setMenuOpen(false);
                clearSelection();
            },
            [clearSelection]
        )
    );

    // کلمات انتخابی: برای یادگیری فقط «جدید»ها، برای مرور فقط «آماده»ها
    const picked = useMemo(() => {
        const learn = [];
        const review = [];
        for (const wid of sel.selected) {
            const row = byId.get(wid);
            if (!row) continue;
            if (row.status.kind === 'new') learn.push(wid);
            else if (row.status.isDue) review.push(wid);
        }
        return { learn, review };
    }, [sel.selected, byId]);

    const { active: selecting, selected } = sel;

    const renderItem = useCallback(
        ({ item }) => (
            <WordRow
                id={item.id}
                en={item.en}
                fa={item.fa}
                box={item.box}
                status={item.status}
                dimmed={item.dimmed}
                selected={selected.has(item.id)}
                selecting={selecting}
                onToggle={toggle}
            />
        ),
        [selected, selecting, toggle]
    );

    const onSelectTab = useCallback(
        (i) => {
            setTab(i);
            setMenuOpen(false);
            header.animateToTab(i);
        },
        [header]
    );
    const onBack = useCallback(() => router.back(), [router]);
    const onToggleMenu = useCallback(() => setMenuOpen((o) => !o), []);
    const onCloseMenu = useCallback(() => setMenuOpen(false), []);
    const onChangeDeckSize = useCallback(
        (n) => {
            setDeckSize(n);
            setMenuOpen(false);
        },
        [setDeckSize]
    );
    const barSpace = useFloatingBarSpace(false);

    if (!source) {
        return (
            <View style={[styles.screen, { paddingTop: header.insets.top }]}>
                <ScreenHeader title="منبع" />
                <View style={styles.center}>
                    <Text style={styles.empty}>این منبع پیدا نشد</Text>
                </View>
            </View>
        );
    }

    // ---------- دکمه‌ها ----------
    const learnCount = selecting ? picked.learn.length : Math.min(deckSize, learnableCount);
    const reviewCount = selecting ? picked.review.length : dueCount;

    const onLearn = () => {
        setMenuOpen(false);
        const extra = selecting ? `&ids=${picked.learn.join(',')}` : '';
        router.push(`/(session)/learn?id=${source.id}${extra}`);
    };
    const onReview = () => {
        setMenuOpen(false);
        const extra = selecting ? `&ids=${picked.review.join(',')}` : '';
        router.push(`/(review)/review?id=${source.id}${extra}`);
    };

    const isWordsTab = tab === 0;

    return (
        <View style={styles.screen}>
            <Animated.FlatList
                style={styles.flex}
                data={isWordsTab ? items : NO_ITEMS}
                extraData={selected}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                windowSize={7}
                onScroll={header.onScroll}
                scrollEventThrottle={16}
                scrollIndicatorInsets={{ top: header.scrollIndicatorTop }}
                contentContainerStyle={[
                    styles.list,
                    { paddingTop: header.listTop, minHeight: header.listMinHeight },
                ]}
                ListEmptyComponent={
                    <Text style={styles.empty}>
                        {isWordsTab ? 'کلمه‌ای برای این منبع پیدا نشد' : 'به‌زودی'}
                    </Text>
                }
            />

            <CollapsingHeader
                header={header}
                title={source.title}
                tabs={TABS}
                tab={tab}
                onSelectTab={onSelectTab}
                onBack={onBack}
            />

            {isWordsTab && selecting && !menuOpen && (
                <SelectionBar
                    count={sel.count}
                    bottom={barSpace + 6}
                    onSelectAll={() => selectAll(items.map((r) => r.id))}
                    onClear={clearSelection}
                />
            )}

            {isWordsTab && menuOpen && <Pressable style={StyleSheet.absoluteFill} onPress={onCloseMenu} />}

            {isWordsTab && (
                <FloatingBar
                    safeBottom={false}
                    items={[
                        {
                            key: 'learn',
                            icon: 'sparkles',
                            label: learnCount > 0 ? `یادگیری (${learnCount})` : 'یادگیری',
                            filled: true,
                            disabled: learnCount === 0,
                            onPress: onLearn,
                            onLongPress: onToggleMenu, // نگه‌داشتن = انتخاب تعداد کلمات دسته
                        },
                        {
                            key: 'review',
                            icon: 'repeat',
                            label: reviewCount > 0 ? `مرور (${reviewCount})` : 'مرور',
                            disabled: reviewCount === 0,
                            onPress: onReview,
                        },
                        {
                            key: 'quiz',
                            icon: 'extension-puzzle-outline',
                            label: 'آزمون',
                            disabled: words.length === 0,
                            onPress: () => router.push(`/(session)/quiz?id=${source.id}`),
                        },
                    ]}
                />
            )}

            {isWordsTab && menuOpen && (
                <DeckSizeMenu style={{ bottom: barSpace + 6 }} value={deckSize} onSelect={onChangeDeckSize} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 24 },
    list: { paddingHorizontal: 20, paddingBottom: 8, gap: 4 },
});