import { useCallback, useState } from 'react';

const EMPTY = new Set();

export default function useSelection() {
    const [selected, setSelected] = useState(EMPTY);

    const toggle = useCallback((id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);
    const selectAll = useCallback((ids) => setSelected(new Set(ids)), []);
    // اگر از قبل خالی است state عوض نمی‌شود (رندر اضافه ندارد)
    const clear = useCallback(() => setSelected((p) => (p.size ? EMPTY : p)), []);

    return { selected, count: selected.size, active: selected.size > 0, toggle, selectAll, clear };
}