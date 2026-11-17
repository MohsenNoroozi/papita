import React, { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { resolveAvatarUrl } from '@/lib/avatar';
import { colors } from '@/theme';

const DEFAULT_AVATAR = require('@/assets/avatar/user.svg');

// uri = مقدار ستون avatar_url (مسیر یا آدرس کامل)
export default function Avatar({ uri, size = 40, style }) {
    const url = useMemo(() => resolveAvatarUrl(uri), [uri]);
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [url]);

    return (
        <Image
            source={url && !failed ? { uri: url } : DEFAULT_AVATAR}
            onError={(e) => {
                console.warn('Avatar load failed:', url, e?.error);
                setFailed(true);
            }}
            contentFit="cover"
            style={[
                { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft },
                style,
            ]}
        />
    );
}