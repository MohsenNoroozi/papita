import { supabase } from './supabase';

const MARK = '/storage/v1/object/public/avatars/';

// مسیر داخل باکت avatars؛ برای آدرس بیرونی (مثل pravatar) null
export function avatarPath(value) {
    if (!value) return null;
    const i = value.indexOf(MARK);
    if (i >= 0) return value.slice(i + MARK.length).split('?')[0]; // آدرس کامل قدیمی
    if (/^https?:\/\//.test(value)) return null;
    return value;
}

// آدرس قابل نمایش با هاست همین کلاینت
export function resolveAvatarUrl(value) {
    if (!value) return null;
    const path = avatarPath(value);
    if (path) return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    return value;
}