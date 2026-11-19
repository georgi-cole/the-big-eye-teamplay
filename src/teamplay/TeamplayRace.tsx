import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { QuickTapRaceCanvasEngine } from '../minigames/quickTapRace/engine/quickTapRaceCanvasEngine'
import type { QTREngineSnapshot } from '../minigames/quickTapRace/engine/types'
import type { Attempt } from './types'

export default function TeamplayRace({
  attempt,
  onStart,
  onFinish,
  busy,
}: {
  attempt: Attempt
  onStart: () => Promise<boolean>
  onFinish: (score: number) => void
  busy: boolean
}) {
  const { t } = useI18n()
  const [playing, setPlaying] = useState(false)
  const [interrupted, setInterrupted] = useState(false)
  const [error, setError] = useState(false)
  const [snapshot, setSnapshot] = useState<QTREngineSnapshot | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<QuickTapRaceCanvasEngine | null>(null)
  const finish = useRef(onFinish)
  useEffect(() => {
    finish.current = onFinish
  }, [onFinish])
  useEffect(() => {
    if (!playing || !canvas.current) return
    let current: QuickTapRaceCanvasEngine
    try {
      current = new QuickTapRaceCanvasEngine(canvas.current, {
        seed: attempt.seed,
        duration: attempt.duration,
        onTick: setSnapshot,
        onFinish: (score) => {
          current.destroy()
          finish.current(score)
          setPlaying(false)
        },
      })
      engine.current = current
    } catch {
      // Report a failed external canvas initialization after the effect commits.
      let disposed = false
      queueMicrotask(() => {
        if (!disposed) {
          setError(true)
          setPlaying(false)
        }
      })
      return () => {
        disposed = true
      }
    }
    const node = canvas.current
    const resize = () =>
      current.resize(node.clientWidth, node.clientHeight, Math.min(window.devicePixelRatio || 1, 2))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(node)
    const interrupt = () => {
      if (document.visibilityState === 'hidden') {
        current.destroy()
        setPlaying(false)
        setInterrupted(true)
      }
    }
    document.addEventListener('visibilitychange', interrupt)
    current.start()
    node.focus({ preventScroll: true })
    node.scrollIntoView({ block: 'nearest' })
    return () => {
      current.destroy()
      engine.current = null
      observer.disconnect()
      document.removeEventListener('visibilitychange', interrupt)
    }
  }, [playing, attempt.seed, attempt.duration])

  return (
    <div className="teamplay-race">
      {!playing ? (
        <>
          {interrupted && <p role="status">{t('teamplay.raceInterrupted')}</p>}
          {error && <p role="alert">{t('teamplay.raceUnavailable')}</p>}
          <button
            disabled={busy}
            onClick={async () => {
              setError(false)
              setSnapshot(null)
              if (await onStart()) setPlaying(true)
            }}
          >
            {t(attempt.status === 'running' ? 'teamplay.raceRestart' : 'teamplay.raceStart')}
          </button>
          {attempt.status === 'running' && <p>{t('teamplay.raceRecovery')}</p>}
        </>
      ) : (
        <>
          <p role="status">
            {snapshot?.phase === 'countdown'
              ? snapshot.countdown || 'GO'
              : t('teamplay.raceScore', {
                  score: snapshot?.effectiveScore ?? 0,
                  seconds: Math.ceil(snapshot?.timeLeft ?? 30),
                })}
          </p>
          <canvas
            ref={canvas}
            tabIndex={0}
            role="button"
            aria-label={t('teamplay.tap')}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault()
                if (!event.repeat) engine.current?.handleKeyboardTap()
              }
            }}
            onPointerDown={(event) => {
              event.preventDefault()
              const box = event.currentTarget.getBoundingClientRect()
              engine.current?.handlePointerDown(
                event.pointerId,
                { x: event.clientX - box.left, y: event.clientY - box.top },
                event.timeStamp,
                performance.now(),
                event.pointerType
              )
            }}
            onPointerUp={(event) => engine.current?.handlePointerUp(event.pointerId)}
            onPointerCancel={(event) => engine.current?.handlePointerUp(event.pointerId)}
          />
          <button
            disabled={!snapshot?.visibleBooster}
            onClick={() => engine.current?.handleKeyboardBooster()}
          >
            {t('teamplay.booster')}
          </button>
        </>
      )}
    </div>
  )
}
