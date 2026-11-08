import React from 'react';
import ConfirmDialog from './ConfirmDialog';

// پنجره تأیید «همه را یاد گرفتم» (مشترک بین صفحه یادگیری و آزمون)
export default function LearnedAllDialog({ visible, total, remaining, onConfirm, onCancel }) {
    return (
        <ConfirmDialog
            visible={visible}
            icon="rocket-outline"
            title={`آیا مطمئنی همه ${total} کلمه را یاد گرفته‌ای؟`}
            message={`${remaining} کلمه باقی مانده است`}
            confirmText="بله مطمئنم"
            cancelText="انصراف"
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}