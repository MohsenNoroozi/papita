"use client"

import { useEffect, useRef } from "react"

// checkbox بومی با پشتیبانی از حالت نیمه‌انتخاب (indeterminate)
export function SelectCheckbox({
                                   checked,
                                   indeterminate = false,
                                   disabled,
                                   label,
                                   onChange,
                               }: {
    checked: boolean
    indeterminate?: boolean
    disabled?: boolean
    label: string
    onChange: (checked: boolean) => void
}) {
    const ref = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate
    }, [indeterminate])

    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-label={label}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 cursor-pointer align-middle accent-brand-deep disabled:cursor-default"
        />
    )
}