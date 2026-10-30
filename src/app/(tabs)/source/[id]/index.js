import React from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';

import {getSource, getWordsOfSource} from '../../../../data/lookup';
import {colors} from '../../../../theme';
import Button from '../../../../components/Button';
import ScreenHeader from '../../../../components/ScreenHeader';

export default function SourceScreen() {
    const router = useRouter();
    const {id} = useLocalSearchParams();
    const sourceId = Number(id);
    const source = getSource(sourceId);
    const words = getWordsOfSource(sourceId);

    if (!source) {
        return (
            <SafeAreaView style={styles.screen} edges={['top']}>
                <ScreenHeader title="منبع"/>
                <View style={styles.center}>
                    <Text style={styles.empty}>این منبع پیدا نشد</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScreenHeader title={source.title}/>

            <View style={{flex: 1}}>
                <FlatList
                    style={{flex: 1}}
                    data={words}
                    keyExtractor={(w) => String(w.id)}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <Text style={styles.count}>{words.length} کلمه</Text>
                    }
                    renderItem={({item}) => (
                        <View style={styles.row}>
                            <Text style={styles.en}>{item.en}</Text>
                            <Text style={styles.fa}>{item.fa}</Text>
                        </View>
                    )}
                />
            </View>

            <View style={styles.footer}>
                <Button
                    title="یادگیری"
                    disabled={words.length === 0}
                    onPress={() => router.push(`/source/${source.id}/learn`)}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: colors.bg},
    center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    empty: {fontSize: 16, color: colors.sub},
    list: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 10,
    },
    count: {fontSize: 14, color: colors.sub, marginBottom: 2, textAlign: 'center'},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    en: {flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left'},
    fa: {flex: 1, fontSize: 16, color: colors.sub, textAlign: 'right', writingDirection: 'rtl'},
    footer: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
    },
});