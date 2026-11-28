"use client"

import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import {HugeiconsIcon} from "@hugeicons/react"
import {Add01Icon, Delete02Icon, RepeatIcon, ArrowLeft04Icon, ArrowRight04Icon} from "@hugeicons/core-free-icons"
import {useTimescape} from "timescape/react"
import {Audio, AudioPlayer, AudioSkin} from "@videojs/react/audio"
import {Video, VideoPlayer, VideoSkin} from "@videojs/react/video"
import "@videojs/react/audio/skin.css"
import "@videojs/react/video/skin.css"

import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {cn} from "@/lib/utils"
import type {MediaType} from "@/lib/media"
import {createPhrase, deletePhrase, updatePhrase, type PhraseInput} from "@/app/(admin)/media/[id]/sentences/actions"

type Sentence = { en: string; fa: string }
type Phrase = { id: number; startMs: number; endMs: number; sentences: Sentence[] }
type Draft = PhraseInput

const formatTime = (ms: number) => {
    const safe = Math.max(0, Math.floor(Number.isFinite(ms) ? ms : 0))
    const minutes = Math.floor(safe / 60000)
    const seconds = Math.floor((safe % 60000) / 1000)
    const millis = safe % 1000
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

const TIME_ORIGIN = new Date(2000, 0, 1, 0, 0, 0, 0).getTime()

function TimeParts({value, onChange, onUseCurrent, label, disabled}: {
    value: number;
    onChange: (value: number) => void;
    onUseCurrent: () => void;
    label: string;
    disabled: boolean;
}) {
    const date = useMemo(() => new Date(TIME_ORIGIN + Math.max(0, value)), [value])
    const {getInputProps, getRootProps} = useTimescape({
        date,
        wrapAround: false,
        snapToStep: true,
        onDateChange: (nextDate) => {
            if (nextDate) onChange(Math.max(0, nextDate.getTime() - TIME_ORIGIN))
        },
    })
    const inputClass = "h-9 min-w-[1.5rem] w-[1.5rem] border-0 bg-transparent px-0 mx-0 text-center font-mono text-sm tabular-nums outline-none focus-visible:ring-0"

    return <div className="flex min-w-0 flex-wrap items-center gap-2" dir="ltr">
        <div {...getRootProps()} role="group" aria-label={label}
             className="flex min-w-0 items-center gap-0.5 rounded-lg border border-input bg-background px-1.5">
            <input {...getInputProps("hours")} aria-label={`${label}، ساعت`} disabled={disabled}
                   className={inputClass}/>
            <span aria-hidden="true" className="px-px text-muted-foreground">:</span>
            <input {...getInputProps("minutes")} aria-label={`${label}، دقیقه`} disabled={disabled}
                   className={inputClass}/>
            <span aria-hidden="true" className="px-px text-muted-foreground">:</span>
            <input {...getInputProps("seconds")} aria-label={`${label}، ثانیه`} disabled={disabled}
                   className={inputClass}/>
            <span aria-hidden="true" className="px-px text-muted-foreground">.</span>
            <input {...getInputProps("milliseconds")} aria-label={`${label}، میلی‌ثانیه`} disabled={disabled}
                   className={cn(inputClass, "min-w-[2.5rem] w-16")}/>
        </div>
        <Button type="button" size="sm" disabled={disabled} onClick={onUseCurrent}
                aria-label={`گذاشتن زمان فعلی پلیر در ${label}`} title="گرفتن زمان فعلی پلیر"
                className="bg-brand-deep px-8">
            زمان کنونی
        </Button>
    </div>
}

function draftOf(phrase: Phrase): Draft {
    return {
        startMs: phrase.startMs,
        endMs: phrase.endMs,
        sentences: phrase.sentences.length ? phrase.sentences.map((line) => ({...line})) : [{en: "", fa: ""}]
    }
}

export function PhraseEditor({mediaId, mediaType, mediaUrl, phrases: initial}: {
    mediaId: number;
    mediaType: MediaType;
    mediaUrl: string | null;
    phrases: Phrase[]
}) {
    const [phrases, setPhrases] = useState(initial)
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [draft, setDraft] = useState<Draft | null>(null)
    const [currentMs, setCurrentMs] = useState(0)
    const [durationMs, setDurationMs] = useState(0)
    const [loopSelected, setLoopSelected] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const mediaRef = useRef<HTMLMediaElement>(null)
    const rowRefs = useRef(new Map<number, HTMLTableRowElement>())
    const doubleClickedRef = useRef<number | null>(null)
    const selectedRef = useRef<number | null>(null)
    const draftRef = useRef<Draft | null>(null)
    const dirtyRef = useRef(false)
    const requestRef = useRef(0)
    const lastActiveRef = useRef<number | null>(null)
    const seekPendingRef = useRef(false)
    const pendingSeekTargetRef = useRef(0)
    const loopSelectedRef = useRef(true)
    const frameDurationRef = useRef(1 / 30)
    const temporaryIdRef = useRef(-1)
    const timerRef = useRef<number | null>(null)
    const persistRef = useRef<(id: number, next: Draft, create?: boolean) => Promise<void>>(async () => {
    })

    const visiblePlayingId = useMemo(() => phrases.find((phrase) => currentMs >= phrase.startMs && currentMs < phrase.endMs)?.id ?? null, [currentMs, phrases])

    const seek = useCallback((ms: number) => {
        const player = mediaRef.current
        if (!player) return
        const target = Math.max(0, ms) / 1000
        if (player.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(player.duration)) {
            seekPendingRef.current = true
            pendingSeekTargetRef.current = target
            const applySeek = () => {
                if (!seekPendingRef.current) return
                if (player.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(player.duration)) return
                player.currentTime = Math.min(pendingSeekTargetRef.current, player.duration)
                setCurrentMs(Math.floor(player.currentTime * 1000))
                seekPendingRef.current = false
                player.removeEventListener("loadedmetadata", applySeek)
                player.removeEventListener("durationchange", applySeek)
            }
            player.addEventListener("loadedmetadata", applySeek)
            player.addEventListener("durationchange", applySeek)
            return
        }
        player.currentTime = Math.min(target, player.duration)
        setCurrentMs(Math.floor(player.currentTime * 1000))
    }, [])

    const selectPhrase = useCallback((phrase: Phrase) => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current)
        if (selectedRef.current !== null && dirtyRef.current && draftRef.current) {
            void persistRef.current(selectedRef.current, draftRef.current)
        }
        selectedRef.current = phrase.id
        setSelectedId(phrase.id)
        const next = draftOf(phrase)
        draftRef.current = next
        dirtyRef.current = false
        setDraft(next)
        setSaveError(null)
    }, [])

    const persist = useCallback(async (id: number, next: Draft, create = false) => {
        const requestId = ++requestRef.current
        setSaving(true)
        setSaveError(null)
        const result = create ? await createPhrase(mediaId, next) : await updatePhrase(id, next)
        if (requestId !== requestRef.current) return
        setSaving(false)
        if (!result.ok) {
            setSaveError(result.error)
            return
        }
        if (create && result.id) {
            setPhrases((current) => current.map((phrase) => phrase.id === id ? {...phrase, id: result.id!} : phrase))
            if (selectedRef.current === id) {
                selectedRef.current = result.id
                setSelectedId(result.id)
            }
        }
        dirtyRef.current = false
        setPhrases((current) => {
            const persistedId = create ? (result.id ?? id) : id
            return current.map((phrase) => phrase.id === persistedId ? {...phrase, ...next} : phrase).sort((a, b) => a.startMs - b.startMs || a.id - b.id)
        })
    }, [mediaId])
    useEffect(() => {
        persistRef.current = persist
    }, [persist])

    useEffect(() => {
        if (!selectedId || !draft || !dirtyRef.current) return
        const phraseId = selectedId
        const snapshot = draft
        timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            void persist(phraseId, snapshot)
        }, 650)
        return () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current)
        }
    }, [draft, persist, selectedId])

    useEffect(() => {
        const row = visiblePlayingId ? rowRefs.current.get(visiblePlayingId) : null
        if (row && visiblePlayingId !== lastActiveRef.current) {
            lastActiveRef.current = visiblePlayingId
            row.scrollIntoView({block: "nearest", behavior: "smooth"})
        }
    }, [visiblePlayingId])

    useEffect(() => {
        loopSelectedRef.current = loopSelected
    }, [loopSelected])

    useEffect(() => {
        const player = mediaRef.current
        if (!player) return
        const syncPlayerState = () => {
            if (Number.isFinite(player.duration) && player.duration > 0) {
                setDurationMs(Math.floor(player.duration * 1000))
            }
            setCurrentMs(Math.floor(player.currentTime * 1000))
            if (seekPendingRef.current && player.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(player.duration)) {
                player.currentTime = Math.min(pendingSeekTargetRef.current / 1000, player.duration)
                setCurrentMs(Math.floor(player.currentTime * 1000))
                seekPendingRef.current = false
            }
        }
        const onTimeUpdate = () => {
            const actualMs = Math.floor(player.currentTime * 1000)
            setCurrentMs(actualMs)
            if (player.paused || !loopSelectedRef.current || !selectedRef.current) return
            const phrase = phrases.find((item) => item.id === selectedRef.current)
            if (phrase && actualMs >= phrase.endMs) {
                player.currentTime = phrase.startMs / 1000
                setCurrentMs(phrase.startMs)
            }
        }
        player.addEventListener("timeupdate", onTimeUpdate)
        player.addEventListener("loadedmetadata", syncPlayerState)
        player.addEventListener("durationchange", syncPlayerState)
        player.addEventListener("loadeddata", syncPlayerState)
        player.addEventListener("progress", syncPlayerState)
        syncPlayerState()
        const video = player instanceof HTMLVideoElement ? player as HTMLVideoElement & {
            requestVideoFrameCallback?: (callback: (now: number, metadata: { mediaTime: number }) => void) => number
            cancelVideoFrameCallback?: (id: number) => void
        } : null
        let frameCallbackId: number | null = null
        let previousMediaTime: number | null = null
        const onVideoFrame = (_now: number, metadata: { mediaTime: number }) => {
            if (previousMediaTime !== null) {
                const difference = metadata.mediaTime - previousMediaTime
                if (difference > 0.005 && difference < 0.2) frameDurationRef.current = difference
            }
            previousMediaTime = metadata.mediaTime
            frameCallbackId = video?.requestVideoFrameCallback?.(onVideoFrame) ?? null
        }
        frameCallbackId = video?.requestVideoFrameCallback?.(onVideoFrame) ?? null
        return () => {
            player.removeEventListener("timeupdate", onTimeUpdate)
            player.removeEventListener("loadedmetadata", syncPlayerState)
            player.removeEventListener("durationchange", syncPlayerState)
            player.removeEventListener("loadeddata", syncPlayerState)
            player.removeEventListener("progress", syncPlayerState)
            if (frameCallbackId !== null) video?.cancelVideoFrameCallback?.(frameCallbackId)
        }
    }, [phrases])

    const updateDraft = (next: Draft) => {
        dirtyRef.current = true
        draftRef.current = next
        setDraft(next)
    }

    const changeTimeMs = (field: "start" | "end", value: number) => {
        const next = {...draftRef.current!, [field === "start" ? "startMs" : "endMs"]: value}
        if (next.endMs <= next.startMs) {
            if (field === "start") {
                next.endMs = next.startMs + 2000
            } else {
                next.startMs = next.endMs - 2000
            }
        }
        setSaveError(null)
        updateDraft(next)
    }

    const setFieldToPlayerTime = (field: "start" | "end") => {
        const player = mediaRef.current
        if (!player || !draftRef.current) return
        const value = Math.floor(player.currentTime * 1000)
        changeTimeMs(field, value)
    }

    const play = () => {
        const player = mediaRef.current
        if (!player) return
        if (player.paused) void player.play()
    }

    const stepVideoFrame = (direction: -1 | 1) => {
        const player = mediaRef.current
        if (!(player instanceof HTMLVideoElement)) return
        player.pause()
        seek((player.currentTime + direction * 1.5 * frameDurationRef.current) * 1000)
    }

    const toggleLoopMode = () => {
        setLoopSelected((current) => {
            const next = !current
            loopSelectedRef.current = next
            if (next && selectedId) seek(draftRef.current?.startMs ?? phrases.find((phrase) => phrase.id === selectedId)?.startMs ?? 0)
            return next
        })
    }

    const insertPhrase = async (index: number, side: "before" | "after") => {
        const neighbor = phrases[index]
        let startMs: number
        let endMs: number

        if ((index === phrases.length - 1) && side === "after") {
            // اگر neighbor آخرین رکورد است و بعد از آن درج می‌کنیم،
            // زمان شروع = زمان کنونی پلیر
            const player = mediaRef.current
            const playerMs = player ? Math.floor(player.currentTime * 1000) : neighbor.endMs
            startMs = Math.max(neighbor.endMs, playerMs)
            endMs = startMs + 2000
        } else {
            startMs = side === "after" ? neighbor.endMs : Math.max(0, neighbor.startMs - 2000)
            endMs = side === "after" ? neighbor.endMs + 2000 : neighbor.startMs
        }

        if (durationMs > 0) {
            endMs = Math.min(endMs, durationMs)
            startMs = Math.min(startMs, Math.max(0, endMs - 2000))
        }
        if (endMs <= startMs) {
            setSaveError("برای افزودن عبارت، بازهٔ زمانی معتبری در دسترس نیست")
            return
        }

        const temporaryId = temporaryIdRef.current--
        const phrase: Phrase = {id: temporaryId, startMs, endMs, sentences: [{en: "", fa: ""}]}
        setPhrases((current) => [...current, phrase].sort((a, b) => a.startMs - b.startMs || a.id - b.id))
        selectPhrase(phrase)
        await persist(temporaryId, draftOf(phrase), true)
    }

    const remove = async (phrase: Phrase) => {
        if (selectedId === phrase.id && timerRef.current !== null) {
            window.clearTimeout(timerRef.current)
            timerRef.current = null
            dirtyRef.current = false
            requestRef.current++
        }
        const result = await deletePhrase(phrase.id)
        if (!result.ok) {
            setSaveError(result.error);
            return
        }
        setPhrases((current) => current.filter((item) => item.id !== phrase.id))
        if (selectedId === phrase.id) {
            const nextPhrase = phrases.find((item) => item.id !== phrase.id)
            if (nextPhrase) selectPhrase(nextPhrase)
        }
    }

    const activeDraft = selectedId ? draft : null

    return (
        <div dir="rtl"
             className="grid h-[calc(100dvh-17.5rem-5rem)] min-h-0 grid-cols-1 gap-4 pb-2 lg:grid-cols-[380px_minmax(0,1fr)]">
            <Card className="order-2 flex min-h-0 min-w-0 flex-col overflow-hidden py-0 shadow-none">
                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="w-full min-w-[760px] table-fixed text-sm">
                                <thead
                                    className="sticky top-0 z-10 bg-muted/90 text-xs text-muted-foreground backdrop-blur">
                                <tr>
                                    <th className="w-36 px-4 py-3 text-center font-medium">زمان شروع</th>
                                    <th className="w-36 px-4 py-3 text-center font-medium">زمان پایان</th>
                                    <th className="px-4 py-3 text-right font-medium">جملات</th>
                                    <th className="w-32 px-3 py-3 text-center font-medium">عملیات</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y">
                                {phrases.map((phrase, index) =>
                                    <tr
                                        id={`${phrase.id}`}
                                        key={phrase.id}
                                        ref={(node) => {
                                            if (node) rowRefs.current.set(phrase.id, node); else rowRefs.current.delete(phrase.id)
                                        }}
                                        onClick={() => selectPhrase(phrase)}
                                        onDoubleClick={() => {
                                            const player = mediaRef.current
                                            if (!player) return
                                            if (!player.paused && doubleClickedRef.current === phrase.id) {
                                                player.pause()
                                            } else {
                                                seek(phrase.startMs)
                                                play()
                                            }
                                            doubleClickedRef.current = phrase.id
                                        }}
                                        className={cn("cursor-pointer transition-colors hover:bg-muted/50", selectedId === phrase.id && "bg-brand-deep/10 hover:bg-brand-deep/10", visiblePlayingId === phrase.id && "font-semibold")}>
                                        <td className="px-4 py-3 text-center font-mono text-xs tabular-nums"
                                            dir="ltr">{formatTime(phrase.startMs)}</td>
                                        <td className="px-4 py-3 text-center font-mono text-xs tabular-nums"
                                            dir="ltr">{formatTime(phrase.endMs)}</td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">{phrase.sentences.map((line, lineIndex) => <div
                                                key={lineIndex} className="grid grid-cols-2 gap-4"><span dir="ltr"
                                                                                                         className="truncate text-left">{line.en ||
                                                <span className="text-muted-foreground">—</span>}</span><span
                                                className="truncate">{line.fa ||
                                                <span className="text-muted-foreground">—</span>}</span></div>)}</div>
                                        </td>
                                        <td className="px-2 py-2">
                                            <div
                                                className="flex justify-center gap-1"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="افزودن عبارت قبل"
                                                    title="افزودن قبل"
                                                    onClick={() => void insertPhrase(index, "before")}>
                                                    <HugeiconsIcon icon={Add01Icon} size={17}/>
                                                    <span className="sr-only">قبل</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="افزودن عبارت بعد"
                                                    title="افزودن بعد"
                                                    onClick={() => void insertPhrase(index, "after")}
                                                >
                                                    <HugeiconsIcon icon={Add01Icon} size={17}/>
                                                    <span className="sr-only">بعد</span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    aria-label="حذف عبارت"
                                                    title="حذف"
                                                    onClick={() => void remove(phrase)}><HugeiconsIcon
                                                    icon={Delete02Icon} size={17}
                                                    className="text-destructive"/>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>)}
                                {phrases.length === 0 &&
                                    <tr>
                                        <td colSpan={4} className="h-36 px-4 text-center text-muted-foreground">
                                            هنوز عبارتی ثبت نشده است.
                                        </td>
                                    </tr>
                                }
                                </tbody>
                            </table>
                        </div>
                        <div
                            className="relative z-10 shrink-0 border-t bg-background p-4 shadow-[0_-3px_8px_-5px_rgba(15,23,42,0.35)] md:p-5">
                            <fieldset disabled={!activeDraft}
                                      className="grid grid-cols-1 gap-4 disabled:opacity-55 md:grid-cols-[150px_150px_minmax(0,1fr)]">
                                <div>
                                    <label className="space-y-1.5 text-xs text-muted-foreground">
                                        <div className="pb-1">زمان شروع</div>
                                        <TimeParts label="زمان شروع" value={activeDraft?.startMs ?? 0}
                                                   onChange={(value) => changeTimeMs("start", value)}
                                                   onUseCurrent={() => setFieldToPlayerTime("start")}
                                                   disabled={!activeDraft}/>
                                    </label>
                                </div>
                                <div>
                                    <label className="space-y-1.5 text-xs text-muted-foreground">
                                        <div className="pb-1">زمان پایان</div>
                                        <TimeParts label="زمان پایان" value={activeDraft?.endMs ?? 0}
                                                   onChange={(value) => changeTimeMs("end", value)}
                                                   onUseCurrent={() => setFieldToPlayerTime("end")}
                                                   disabled={!activeDraft}/>
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                                        <span className="text-center" dir="ltr">English</span>
                                        <span className="text-center" dir="rtl">فارسی</span>
                                    </div>
                                    {activeDraft?.sentences.map((line, index) =>
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                dir="ltr"
                                                value={line.en} aria-label={`جمله انگلیسی ${index + 1}`}
                                                placeholder="English sentence" className="text-left"
                                                onChange={(event) => {
                                                    const sentences = [...(draftRef.current?.sentences ?? [])];
                                                    sentences[index] = {...sentences[index], en: event.target.value};
                                                    updateDraft({...draftRef.current!, sentences})
                                                }}
                                            />
                                            <Input
                                                value={line.fa} aria-label={`جمله فارسی ${index + 1}`}
                                                placeholder="جمله فارسی"
                                                onChange={(event) => {
                                                    const sentences = [...(draftRef.current?.sentences ?? [])];
                                                    sentences[index] = {...sentences[index], fa: event.target.value};
                                                    updateDraft({...draftRef.current!, sentences})
                                                }}
                                            />
                                            <Button
                                                type="button" variant="ghost" size="icon-sm" aria-label="حذف جفت جمله"
                                                disabled={activeDraft.sentences.length <= 1}
                                                onClick={() => updateDraft({
                                                    ...draftRef.current!,
                                                    sentences: draftRef.current!.sentences.filter((_, i) => i !== index)
                                                })}
                                            ><HugeiconsIcon icon={Delete02Icon} size={16}/></Button>
                                        </div>)}
                                    <Button type="button" variant="outline" size="sm"
                                            onClick={() => updateDraft({
                                                ...draftRef.current!,
                                                sentences: [...draftRef.current!.sentences, {en: "", fa: ""}]
                                            })}><HugeiconsIcon icon={Add01Icon} size={16}/> افزودن جمله</Button>
                                </div>
                            </fieldset>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="order-1 flex min-w-0 flex-col self-start overflow-hidden py-0 shadow-none">
                <CardContent className="flex flex-col gap-4 p-4">
                    <span className="ms-auto font-mono text-xs tabular-nums">
                        {formatTime(currentMs)}<span className="text-muted-foreground">/</span>{formatTime(durationMs)}
                    </span>
                    <div className="overflow-hidden rounded-xl bg-black">
                        {mediaUrl ? mediaType === "video" ? (
                            <VideoPlayer>
                                <VideoSkin style={{width: "100%", aspectRatio: "16 / 9"}}>
                                    <Video
                                        ref={mediaRef as React.RefObject<HTMLVideoElement>}
                                        src={mediaUrl}
                                        playsInline
                                        preload="metadata"
                                        onError={() => setSaveError("پخش فایل مدیا ممکن نیست")}/>
                                </VideoSkin>
                            </VideoPlayer>
                        ) : (
                            <AudioPlayer>
                                <AudioSkin style={{width: "100%"}}>
                                    <Audio
                                        ref={mediaRef as React.RefObject<HTMLAudioElement>}
                                        src={mediaUrl}
                                        preload="metadata"
                                        onError={() => setSaveError("پخش فایل مدیا ممکن نیست")}/>
                                </AudioSkin>
                            </AudioPlayer>
                        ) : (
                            <div className="flex h-40 items-center justify-center text-sm text-white/70">فایلی برای پخش
                                ثبت نشده است</div>
                        )}
                    </div>
                    <div className="flex min-w-0 items-center gap-3 justify-center">
                        <Button type="button" variant={loopSelected ? "secondary" : "outline"} size="icon"
                                className={cn("shrink-0", loopSelected && "inset-shadow-sm ring-1 ring-primary/20")}
                                onClick={toggleLoopMode} aria-pressed={loopSelected}
                                aria-label={loopSelected ? "تکرار عبارت انتخاب‌شده فعال" : "پخش پیوسته فعال"}
                                title={loopSelected ? "فقط عبارت انتخاب‌شده" : "پخش پیوسته"}><HugeiconsIcon
                            icon={RepeatIcon} size={18}/></Button>
                        {mediaType === "video" && <>
                            <Button
                                type="button" variant="outline" size="icon-sm"
                                onClick={() => stepVideoFrame(1)}
                                disabled={!mediaUrl} aria-label="یک فریم به جلو" title="یک فریم به جلو"
                            >
                                <HugeiconsIcon icon={ArrowRight04Icon} size={17}/>
                            </Button>
                            <Button
                                type="button" variant="outline" size="icon-sm"
                                onClick={() => stepVideoFrame(-1)}
                                disabled={!mediaUrl} aria-label="یک فریم به عقب" title="یک فریم به عقب"
                            >
                                <HugeiconsIcon icon={ArrowLeft04Icon} size={17}/>
                            </Button>
                        </>
                        }
                    </div>

                    {saveError && <p role="status" className="text-sm text-destructive">{saveError}</p>}
                    <span className="sr-only" role="status">{saving ? "در حال ذخیره" : "ذخیره‌شده"}</span>
                </CardContent>
            </Card>
        </div>
    )
}
