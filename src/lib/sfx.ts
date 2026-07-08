/**
 * Tiny WebAudio chiptune synth for game-feel — no audio assets. Respects
 * the sound setting (Settings → Geluid) and never throws: audio is pure
 * garnish. The context is created lazily on first (gesture-driven) call.
 */

const SOUND_KEY = 'hero-fuel-sound'

export function soundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== '0'
}

export function setSoundEnabled(on: boolean): void {
  localStorage.setItem(SOUND_KEY, on ? '1' : '0')
}

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!soundEnabled()) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

interface Note {
  freq: number
  at: number
  dur: number
  type?: OscillatorType
  vol?: number
}

function play(notes: Note[]) {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  for (const n of notes) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = n.type ?? 'square'
    osc.frequency.value = n.freq
    const t0 = now + n.at
    const vol = n.vol ?? 0.06
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.dur)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + n.dur + 0.02)
  }
}

export const sfx = {
  /** short positive blip (catch, tap) */
  pop() {
    play([{ freq: 880, at: 0, dur: 0.08 }])
  },
  /** coin pickup — classic two-tone */
  coin() {
    play([
      { freq: 988, at: 0, dur: 0.07 },
      { freq: 1319, at: 0.07, dur: 0.18 },
    ])
  },
  /** mission claim — rising arpeggio */
  claim() {
    play([
      { freq: 523, at: 0, dur: 0.09 },
      { freq: 659, at: 0.08, dur: 0.09 },
      { freq: 784, at: 0.16, dur: 0.2 },
    ])
  },
  /** chest fanfare */
  chest() {
    play([
      { freq: 392, at: 0, dur: 0.12 },
      { freq: 523, at: 0.11, dur: 0.12 },
      { freq: 659, at: 0.22, dur: 0.12 },
      { freq: 784, at: 0.33, dur: 0.3 },
      { freq: 1047, at: 0.33, dur: 0.3, vol: 0.04 },
    ])
  },
  /** badge/level fanfare */
  fanfare() {
    play([
      { freq: 523, at: 0, dur: 0.1 },
      { freq: 784, at: 0.1, dur: 0.1 },
      { freq: 1047, at: 0.2, dur: 0.35 },
    ])
  },
  /** soft negative thud (hit in the game) — never harsh */
  hit() {
    play([
      { freq: 196, at: 0, dur: 0.15, type: 'triangle', vol: 0.08 },
      { freq: 147, at: 0.05, dur: 0.18, type: 'triangle', vol: 0.06 },
    ])
  },
  /** whoosh for logging fuel */
  whoosh() {
    play([
      { freq: 300, at: 0, dur: 0.06, type: 'sine' },
      { freq: 500, at: 0.05, dur: 0.06, type: 'sine' },
      { freq: 750, at: 0.1, dur: 0.12, type: 'sine' },
    ])
  },
}
