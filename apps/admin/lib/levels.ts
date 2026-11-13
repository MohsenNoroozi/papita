export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const

export const levelLabel = (level: number) => LEVELS[level - 1] ?? "—"