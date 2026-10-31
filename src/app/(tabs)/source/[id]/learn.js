import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getSource, getWordsOfSource } from '../../../../data/lookup';
import { useProgress } from '../../../../context/ProgressContext';
import { useSettings } from '../../../../context/SettingsContext';
import { shuffle } from '../../../../leitner';
import { stopSpeaking } from '../../../../speech';
import { colors } from '../../../../theme';
import FlashCard from '../../../../components/FlashCard';
import FillIconButton from '../../../../components/FillIconButton';
import RoundIconButton from '../../../../components/RoundIconButton';
import LearnedAllDialog from '../../../../components/LearnedAllDialog';
import ProgressBar from '../../../../components/ProgressBar';
import ScreenHeader from '../../../../components/ScreenHeader';

const BUTTON_SIZE = 56;

export default function SourceLearn() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const sourceId = Number(id);
    const source = getSource(sourceId);

    const { progress, addToBox1, removeFromBoxes } = useProgress();
    const { autoSpeak, setAutoSpeak } = useSettings();

    // ترتیب کلمات: هنگام باز شدن صفحه تصادفی است
    const [words, setWords] = useState(() => shuffle(getWordsOfSource(sourceId)));
    const [idx, setIdx] = useState(0);
    const [enter, setEnter] = useState(null); // سمتی که کارت بعدی از آن وارد می‌شود
    const [deckKey, setDeckKey] = useState(0); // با هر بار رندوم‌کردن، کارت دوباره ساخته می‌شود
    const [hasMoved, setHasMoved] = useState(false); // تا اولین تغییر کارت، تلفظ خودکار نداریم
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => () => stopSpeaking(), []);

    if (!source || words.length === 0) {
        return (
            <SafeAreaView style={styles.screen} edges={['top']}>
                <ScreenHeader title={source?.title ?? 'منبع'} />
                <View style={styles.center}>
                    <Text style={styles.empty}>کلمه‌ای برای این منبع پیدا نشد</Text>
                </View>
            </SafeAreaView>
        );
    }

    const word = words[idx];
    const entry = progress[word.id];
    const isLast = idx === words.length - 1;

    const unadded = words.filter((w) => !progress[w.id]);
    const ratio = (words.length - unadded.length) / words.length; // نسبت کلمات داخل جعبه‌ها به کل

    // رفتن به یک کارت دیگر؛ from = سمتی که کارت جدید از آن وارد می‌شود
    const goTo = (nextIdx, from) => {
        setEnter(from);
        setIdx(nextIdx);
        setHasMoved(true);
    };

    // راست = بعدی (از چپ وارد می‌شود)، چپ = قبلی (از راست وارد می‌شود)
    const handleSwipe = (toRight) => {
        if (toRight) goTo(Math.min(idx + 1, words.length - 1), 'left');
        else goTo(Math.max(idx - 1, 0), 'right');
    };

    // بالا: اگر در جعبه‌ای نیست به جعبه ۱ برود، بعد کلمه بعدی (از چپ وارد می‌شود)
    const handleSwipeUp = () => {
        if (!entry) addToBox1([word.id]);
        if (!isLast) goTo(idx + 1, 'left');
    };

    // پایین: از همه جعبه‌ها حذف شود، بعد کلمه بعدی (از چپ وارد می‌شود)
    const handleSwipeDown = () => {
        if (entry) removeFromBoxes([word.id]);
        if (!isLast) goTo(idx + 1, 'left');
    };

    // ترتیب تصادفی جدید و رفتن به اولین کلمه
    const reshuffle = () => {
        setWords(shuffle(getWordsOfSource(sourceId)));
        setDeckKey((k) => k + 1);
        goTo(0, 'left');
    };

    const confirmLearnedAll = () => {
        addToBox1(unadded.map((w) => w.id));
        setConfirmOpen(false);
    };

    const toggleAutoSpeak = () => {
        if (autoSpeak) stopSpeaking();
        setAutoSpeak(!autoSpeak);
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScreenHeader
                title={source.title}
                right={<Text style={styles.counter}>{`${idx + 1} / ${words.length}`}</Text>}
            />
            <View style={styles.bar}>
                <ProgressBar value={(idx + 1) / words.length} />
            </View>

            <View style={styles.cardArea}>
                <FlashCard
                    key={`${deckKey}-${word.id}`}
                    word={word}
                    onSwipe={handleSwipe}
                    onSwipeUp={handleSwipeUp}
                    onSwipeDown={handleSwipeDown}
                    allowLeft={idx > 0}
                    allowRight={!isLast}
                    verticalExits={!isLast}
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
                <RoundIconButton
                    icon="shuffle"
                    size={BUTTON_SIZE}
                    onPress={reshuffle}
                    accessibilityLabel="ترتیب تصادفی"
                />

                <FillIconButton
                    icon="rocket-outline"
                    size={BUTTON_SIZE}
                    ratio={ratio}
                    disabled={unadded.length === 0}
                    onPress={() => setConfirmOpen(true)}
                    accessibilityLabel="همه را یاد گرفتم"
                />

                <RoundIconButton
                    icon="extension-puzzle-outline"
                    size={BUTTON_SIZE}
                    onPress={() => router.push(`/source/${source.id}/quiz`)}
                    accessibilityLabel="آزمون"
                />

                <RoundIconButton
                    icon={autoSpeak ? 'volume-high-outline' : 'volume-mute-outline'}
                    size={BUTTON_SIZE}
                    muted={!autoSpeak}
                    onPress={toggleAutoSpeak}
                    accessibilityLabel="تلفظ خودکار"
                    accessibilityState={{ selected: autoSpeak }}
                />
            </View>

            <LearnedAllDialog
                visible={confirmOpen}
                total={words.length}
                remaining={unadded.length}
                onConfirm={confirmLearnedAll}
                onCancel={() => setConfirmOpen(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { fontSize: 16, color: colors.sub },
    counter: { fontSize: 15, color: colors.sub },
    bar: { paddingHorizontal: 24, marginTop: 4 },
    cardArea: { flex: 1, justifyContent: 'center' },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
        paddingTop: 8,
    },
});