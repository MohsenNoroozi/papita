import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { avatarPath } from '../lib/avatar';

const Ctx = createContext(null);
const COLS = 'fullname,email,avatar_url,level';

export function ProfileProvider({ children }) {
    const { session } = useAuth();
    const user = session.user;
    const [profile, setProfile] = useState(null);

    const load = useCallback(async () => {
        const { data, error } = await supabase.from('profiles').select(COLS).eq('id', user.id).single();
        if (!error && data) setProfile(data);
    }, [user.id]);

    useEffect(() => {
        load();
    }, [load]);

    // خروجی: null = موفق، وگرنه خطا
    const updateProfile = useCallback(
        async (patch) => {
            const { data, error } = await supabase
                .from('profiles')
                .update(patch)
                .eq('id', user.id)
                .select(COLS)
                .single();
            if (error) return error;
            setProfile(data);
            return null;
        },
        [user.id]
    );

    // uri: عکس JPEG که قبلاً کوچک شده؛ خروجی: null = موفق، وگرنه خطا
    const oldAvatar = profile?.avatar_url;
    const uploadAvatar = useCallback(
        async (base64) => {
            try {
                const path = `${user.id}/${Date.now()}.jpg`;
                const { error } = await supabase.storage
                    .from('avatars')
                    .upload(path, decode(base64), { contentType: 'image/jpeg' });
                if (error) return error;

                const err = await updateProfile({ avatar_url: path }); // فقط مسیر
                if (err) return err;

                // پاک کردن فایل قبلی (اگر مال خود کاربر بود)
                const old = avatarPath(oldAvatar);
                if (old && old !== path && old.startsWith(`${user.id}/`)) {
                    supabase.storage.from('avatars').remove([old]).catch(() => {});
                }
                return null;
            } catch (e) {
                return e;
            }
        },
        [user.id, updateProfile, oldAvatar]
    );

    return (
        <Ctx.Provider
            value={{
                profile,
                email: profile?.email ?? user.email,
                updateProfile,
                uploadAvatar,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}

export const useProfile = () => useContext(Ctx);