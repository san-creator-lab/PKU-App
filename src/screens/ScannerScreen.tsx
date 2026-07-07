import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defaultMealType } from '@/lib/meals'
import { useAppStore } from '@/hooks/useAppStore'
import { backend, type MealType } from '@/lib/backend'
import { CONFIDENCE_THRESHOLD, ocrProvider, type OcrResult } from '@/lib/ocr'
import { MEAL_EMOJI, MEAL_LABELS, t } from '@/lib/i18n'

type Phase = 'camera' | 'processing' | 'confirm' | 'fallback'

const SCAN_MESSAGES = [
  'Scanner draait op volle kracht… ⚡',
  'Röntgenblik geactiveerd… 🦸',
  'Brandstofwaarden zoeken… 🔍',
]

export function ScannerScreen() {
  const navigate = useNavigate()
  const addEntry = useAppStore((s) => s.addEntry)
  const myProfile = useAppStore((s) => s.myProfile)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('camera')
  const [cameraReady, setCameraReady] = useState(false)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [scanMsg, setScanMsg] = useState(SCAN_MESSAGES[0])

  // confirm state
  const [grams, setGrams] = useState('')
  const [servings, setServings] = useState(1)
  const [mealType, setMealType] = useState<MealType>(defaultMealType())
  const [foodName, setFoodName] = useState('')
  const [busy, setBusy] = useState(false)

  // -- camera lifecycle ----------------------------------------------------
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCameraReady(true)
      } catch {
        setCameraReady(false) // upload path stays available
      }
    }
    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (phase !== 'processing') return
    const id = setInterval(
      () => setScanMsg(SCAN_MESSAGES[Math.floor(Math.random() * SCAN_MESSAGES.length)]),
      1400,
    )
    return () => clearInterval(id)
  }, [phase])

  const runOcr = useCallback(async (blob: Blob, previewUrl: string) => {
    setSnapshot(previewUrl)
    setPhotoBlob(blob)
    setPhase('processing')
    const ocr = await ocrProvider.extract(blob)
    setResult(ocr)
    const value = ocr.protein_per_serving ?? ocr.protein_per_100g
    if (ocr.confidence >= CONFIDENCE_THRESHOLD && value !== null) {
      setGrams(String(value).replace('.', ','))
      setPhase('confirm')
    } else {
      setPhase('fallback')
    }
  }, [])

  async function capture() {
    const video = videoRef.current
    if (!video || !cameraReady) return
    const scale = Math.min(1, 1280 / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (blob) await runOcr(blob, canvas.toDataURL('image/jpeg', 0.7))
  }

  async function onFile(file: File | null) {
    if (!file) return
    // downscale uploads the same way as captures
    const url = URL.createObjectURL(file)
    const img = new Image()
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
      img.src = url
    })
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(url)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (blob) await runOcr(blob, canvas.toDataURL('image/jpeg', 0.7))
  }

  async function log(source: 'scan' | 'manual') {
    const value = Number(grams.replace(',', '.'))
    if (Number.isNaN(value) || value < 0) return
    setBusy(true)
    try {
      let photoUrl: string | null = null
      if (photoBlob && myProfile?.family_id && source === 'scan') {
        photoUrl = await downscaleAndUpload(photoBlob, myProfile.family_id)
      }
      const total = Math.round(value * servings * 10) / 10
      await addEntry({
        food_name:
          foodName.trim() ||
          (result?.serving_size ? `Gescand (${result.serving_size})` : 'Gescand etiket'),
        protein_grams: total,
        meal_type: mealType,
        source,
        photo_url: photoUrl,
      })
      navigate('/')
    } finally {
      setBusy(false)
    }
  }

  const perServing = result?.protein_per_serving ?? null
  const per100 = result?.protein_per_100g ?? null

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-navy-950">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900/80 text-xl backdrop-blur"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
        >
          ✕
        </button>
        <span className="rounded-full bg-navy-900/80 px-4 py-2 font-display text-sm font-semibold text-electric-400 backdrop-blur">
          📸 Heldenscanner
        </span>
      </div>

      {/* camera / snapshot layer */}
      <div className="relative flex-1 overflow-hidden">
        {phase === 'camera' && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
        )}
        {snapshot && phase !== 'camera' && (
          <img
            src={snapshot}
            alt="Gescand etiket"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* visor HUD */}
        {(phase === 'camera' || phase === 'processing') && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-navy-950/50" />
            <div className="absolute left-1/2 top-1/2 h-64 w-[85%] -translate-x-1/2 -translate-y-1/2">
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_0_9999px_rgba(10,18,32,0.55)]" />
              {/* corner brackets */}
              {[
                'left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl',
                'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
                'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-2xl',
                'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl',
              ].map((cls) => (
                <div key={cls} className={`absolute h-10 w-10 border-electric-500 ${cls}`} />
              ))}
              {/* scan line */}
              <motion.div
                className="absolute inset-x-3 h-0.5 rounded bg-electric-400 shadow-glow"
                animate={{ top: ['8%', '90%', '8%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* HUD ticks */}
              <div className="absolute -top-8 left-0 font-mono text-[10px] tracking-widest text-electric-500/80">
                PWR ▮▮▮▮▯ · ZOOM 1.0×
              </div>
            </div>
            <p className="absolute inset-x-6 bottom-40 text-center font-display text-lg text-white drop-shadow">
              {phase === 'processing' ? scanMsg : 'Richt je vizier op de voedingswaardentabel'}
            </p>
          </div>
        )}

        {/* processing spinner */}
        {phase === 'processing' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <motion.div
              className="h-20 w-20 rounded-full border-4 border-electric-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              aria-label={t('common.loading')}
            />
          </div>
        )}
      </div>

      {/* bottom controls */}
      <div className="safe-bottom relative z-20 bg-navy-950 p-4">
        {phase === 'camera' && (
          <div className="flex items-center justify-center gap-6">
            <button
              className="btn-ghost h-14 px-4 text-sm"
              onClick={() => fileRef.current?.click()}
            >
              📁 Upload foto
            </button>
            <button
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-electric-500 bg-electric-500/20 text-3xl shadow-glow transition active:scale-90 disabled:opacity-40"
              onClick={() => void capture()}
              disabled={!cameraReady}
              aria-label="Maak foto van etiket"
            >
              ⚡
            </button>
            <div className="w-24 text-xs text-slate-400">
              {cameraReady ? 'Klaar om te scannen!' : 'Geen camera? Upload een foto.'}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              aria-label="Upload een foto van het etiket"
            />
          </div>
        )}

        <AnimatePresence>
          {(phase === 'confirm' || phase === 'fallback') && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {phase === 'confirm' ? (
                <div className="glass-card border-electric-500/40 p-4">
                  <h2 className="font-display text-xl text-electric-400">
                    Gevonden! 🎯
                  </h2>
                  <p className="text-sm text-slate-300">
                    {perServing !== null ? (
                      <>
                        <strong>{String(perServing).replace('.', ',')} g</strong> brandstof{' '}
                        {t('add.perServing')}
                        {result?.serving_size ? ` (${result.serving_size})` : ''}
                        {per100 !== null && (
                          <span className="text-slate-400">
                            {' '}· {String(per100).replace('.', ',')} g {t('add.per100')}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <strong>{String(per100).replace('.', ',')} g</strong> brandstof{' '}
                        {t('add.per100')}
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="glass-card border-gold-500/40 p-4">
                  <h2 className="font-display text-xl text-gold-400">
                    Mijn scanner heeft hulp nodig! 🛠️
                  </h2>
                  <p className="text-sm text-slate-300">
                    Ik kon de brandstofwaarde niet goed lezen. Vul &apos;m zelf in —
                    teamwork!
                  </p>
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="sc-grams">
                    {t('add.grams')} {phase === 'confirm' && perServing !== null ? t('add.perServing') : ''}
                  </label>
                  <input
                    id="sc-grams"
                    className="input-hero text-center font-display text-2xl text-electric-400"
                    inputMode="decimal"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="0,0"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="sc-servings">
                    {t('add.servings')}
                  </label>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn-ghost h-12 w-12 p-0 text-xl"
                      onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}
                      aria-label="Minder porties">−</button>
                    <output id="sc-servings" className="flex-1 text-center font-display text-2xl">
                      {String(servings).replace('.', ',')}
                    </output>
                    <button type="button" className="btn-ghost h-12 w-12 p-0 text-xl"
                      onClick={() => setServings((s) => Math.min(5, s + 0.5))}
                      aria-label="Meer porties">+</button>
                  </div>
                </div>
              </div>

              <input
                className="input-hero"
                placeholder={`${t('add.foodName')} (mag leeg)`}
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                aria-label={t('add.foodName')}
              />

              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('add.mealType')}>
                {(Object.keys(MEAL_LABELS) as MealType[]).map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    role="radio"
                    aria-checked={mealType === mt}
                    className={`flex min-h-[56px] flex-col items-center justify-center rounded-hero border-2 p-1 transition ${
                      mealType === mt ? 'border-gold-500 bg-gold-500/15' : 'border-white/15 bg-white/5'
                    }`}
                    onClick={() => setMealType(mt)}
                  >
                    <span aria-hidden="true">{MEAL_EMOJI[mt]}</span>
                    <span className="text-[9px] font-semibold text-slate-300">
                      {t(MEAL_LABELS[mt])}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  className="btn-ghost flex-1"
                  onClick={() => {
                    setPhase('camera')
                    setSnapshot(null)
                    setResult(null)
                  }}
                >
                  🔄 Opnieuw
                </button>
                <button
                  className="btn-hero flex-[2]"
                  disabled={busy || grams === ''}
                  onClick={() => void log(phase === 'confirm' ? 'scan' : 'manual')}
                >
                  {busy
                    ? t('common.loading')
                    : `+${(Number(grams.replace(',', '.')) * servings || 0)
                        .toFixed(1)
                        .replace('.', ',')} g — ${t('add.log')}`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Downscale to 640px and store via the backend (signed URL or data URL). */
async function downscaleAndUpload(blob: Blob, familyId: string): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const small = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.7),
    )
    if (!small) return null
    return await backend.uploadLabelPhoto(familyId, small)
  } catch {
    return null
  }
}
