import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { parseGear } from '@/lib/economy'
import { sfx } from '@/lib/sfx'

/**
 * Fuel Rush — the arcade mini-game. Catch fuel (bolts/stars/power fruit),
 * dodge meteors, build combos. A run costs one game token (earned by
 * logging fuel); the score pays out coins for the hero shop. Pure canvas,
 * 45 seconds, tuned for one thumb.
 */

const GAME_SECONDS = 45
const START_SHIELDS = 3

type ItemKind = 'bolt' | 'star' | 'fruit' | 'meteor'

interface FallingItem {
  kind: ItemKind
  x: number
  y: number
  speed: number
  size: number
  wobble: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  color: string
}

interface FloatText {
  x: number
  y: number
  text: string
  age: number
  color: string
}

const ITEM_META: Record<ItemKind, { emoji: string; points: number }> = {
  bolt: { emoji: '⚡', points: 10 },
  star: { emoji: '⭐', points: 15 },
  fruit: { emoji: '🍎', points: 10 },
  meteor: { emoji: '☄️', points: 0 },
}

const SUIT_COLORS: Record<string, { main: string; dark: string }> = {
  suit_classic: { main: '#00D4FF', dark: '#00A8CC' },
  suit_rood: { main: '#FF5A5A', dark: '#D43C3C' },
  suit_groen: { main: '#35D46A', dark: '#22A34E' },
  suit_zwart: { main: '#4A5568', dark: '#2D3748' },
}

type Phase = 'intro' | 'playing' | 'paused' | 'done'

export function GameScreen() {
  const navigate = useNavigate()
  const startGame = useAppStore((s) => s.startGame)
  const finishGame = useAppStore((s) => s.finishGame)
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const hero = heroProfileOf({ familyProfiles, myProfile })
  const tokens = hero?.game_tokens ?? 0
  const gear = parseGear(hero)
  const suit = SUIT_COLORS[gear.equipped.suit ?? 'suit_classic'] ?? SUIT_COLORS.suit_classic

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const phaseRef = useRef<Phase>('intro')
  phaseRef.current = phase

  const [finalScore, setFinalScore] = useState(0)
  const [coinsWon, setCoinsWon] = useState<number | null>(null)
  const [isNewHiscore, setIsNewHiscore] = useState(false)

  // mutable game state lives in refs — React only renders overlays
  const game = useRef({
    score: 0,
    combo: 0,
    multiplier: 1,
    shields: START_SHIELDS,
    timeLeft: GAME_SECONDS,
    heroX: 195,
    targetX: 195,
    items: [] as FallingItem[],
    particles: [] as Particle[],
    floats: [] as FloatText[],
    spawnTimer: 0,
    shake: 0,
    width: 390,
    height: 560,
  })

  const endRun = useCallback(
    async (score: number) => {
      setPhase('done')
      setFinalScore(score)
      setIsNewHiscore(score > gear.stats.hiscore)
      const coins = await finishGame(score)
      setCoinsWon(coins)
    },
    [finishGame, gear.stats.hiscore],
  )

  const beginRun = useCallback(async () => {
    const ok = await startGame()
    if (!ok) return
    const g = game.current
    g.score = 0
    g.combo = 0
    g.multiplier = 1
    g.shields = START_SHIELDS
    g.timeLeft = GAME_SECONDS
    g.items = []
    g.particles = []
    g.floats = []
    g.spawnTimer = 0
    g.shake = 0
    setCoinsWon(null)
    setPhase('playing')
  }, [startGame])

  // -- input -----------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let dragging = false
    const toGameX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect()
      return ((clientX - rect.left) / rect.width) * game.current.width
    }
    const down = (e: PointerEvent) => {
      dragging = true
      game.current.targetX = toGameX(e.clientX)
    }
    const move = (e: PointerEvent) => {
      if (dragging) game.current.targetX = toGameX(e.clientX)
    }
    const up = () => {
      dragging = false
    }
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    const keys = (e: KeyboardEvent) => {
      const g = game.current
      if (e.key === 'ArrowLeft') g.targetX = Math.max(30, g.targetX - 46)
      if (e.key === 'ArrowRight') g.targetX = Math.min(g.width - 30, g.targetX + 46)
    }
    window.addEventListener('keydown', keys)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', keys)
    }
  }, [])

  // pause when the tab goes hidden
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phaseRef.current === 'playing') setPhase('paused')
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  // -- game loop ---------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      game.current.width = rect.width
      game.current.height = rect.height
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    let last = performance.now()
    let raf = 0

    const spawn = (g: typeof game.current, elapsed: number) => {
      const meteorChance = 0.15 + 0.12 * (elapsed / GAME_SECONDS)
      const roll = Math.random()
      const kind: ItemKind =
        roll < meteorChance
          ? 'meteor'
          : roll < meteorChance + 0.2
            ? 'star'
            : roll < meteorChance + 0.4
              ? 'fruit'
              : 'bolt'
      g.items.push({
        kind,
        x: 24 + Math.random() * (g.width - 48),
        y: -30,
        speed: 130 + 130 * (elapsed / GAME_SECONDS) + Math.random() * 40,
        size: kind === 'meteor' ? 30 : 26,
        wobble: Math.random() * Math.PI * 2,
      })
    }

    const drawHero = (g: typeof game.current) => {
      const x = g.heroX
      const y = g.height - 64
      ctx.save()
      ctx.translate(x, y)
      // jet flame
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.moveTo(-8, 34)
      ctx.quadraticCurveTo(0, 46 + Math.random() * 8, 8, 34)
      ctx.closePath()
      ctx.fill()
      // cape
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.moveTo(-16, -6)
      ctx.quadraticCurveTo(-26, 18, -18, 32)
      ctx.lineTo(18, 32)
      ctx.quadraticCurveTo(26, 18, 16, -6)
      ctx.closePath()
      ctx.fill()
      // body
      ctx.fillStyle = suit.main
      ctx.beginPath()
      ctx.roundRect(-14, -8, 28, 40, 10)
      ctx.fill()
      ctx.fillStyle = suit.dark
      ctx.beginPath()
      ctx.roundRect(-14, 16, 28, 16, 8)
      ctx.fill()
      // head
      ctx.fillStyle = '#FFD7B8'
      ctx.beginPath()
      ctx.arc(0, -18, 13, 0, Math.PI * 2)
      ctx.fill()
      // mask
      ctx.fillStyle = '#0F1B2D'
      ctx.beginPath()
      ctx.roundRect(-11, -24, 22, 9, 4)
      ctx.fill()
      // emblem
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('⚡', 0, 10)
      ctx.restore()
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const g = game.current

      // background
      ctx.clearRect(0, 0, g.width, g.height)
      const grad = ctx.createLinearGradient(0, 0, 0, g.height)
      grad.addColorStop(0, '#0A1220')
      grad.addColorStop(1, '#16263D')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, g.width, g.height)
      // starfield
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      for (let i = 0; i < 24; i++) {
        const sy = ((i * 97 + now * 0.02 * (30 + (i % 5) * 14)) % (g.height + 20)) - 10
        ctx.fillRect((i * 53) % g.width, sy, 2, 2)
      }

      if (phaseRef.current !== 'playing') {
        drawHero(g)
        return
      }

      const elapsed = GAME_SECONDS - g.timeLeft
      g.timeLeft -= dt
      if (g.timeLeft <= 0 || g.shields <= 0) {
        void endRun(g.score)
        return
      }

      // spawn
      g.spawnTimer -= dt
      if (g.spawnTimer <= 0) {
        spawn(g, elapsed)
        g.spawnTimer = Math.max(0.34, 0.72 - 0.38 * (elapsed / GAME_SECONDS))
      }

      // hero movement (smooth chase)
      g.heroX += (g.targetX - g.heroX) * Math.min(1, dt * 14)
      g.heroX = Math.max(24, Math.min(g.width - 24, g.heroX))

      // shake decay
      if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 30)
      ctx.save()
      if (g.shake > 0) {
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake)
      }

      // items
      const heroY = g.height - 64
      g.items = g.items.filter((item) => {
        item.y += item.speed * dt
        item.wobble += dt * 4
        const drawX = item.x + Math.sin(item.wobble) * 6
        ctx.font = `${item.size}px sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(ITEM_META[item.kind].emoji, drawX, item.y)

        // catch/hit detection near the hero
        if (item.y > heroY - 26 && item.y < heroY + 34 && Math.abs(drawX - g.heroX) < 34) {
          if (item.kind === 'meteor') {
            g.shields -= 1
            g.combo = 0
            g.multiplier = 1
            g.shake = 14
            sfx.hit()
            g.floats.push({ x: drawX, y: item.y, text: '-1 🛡️', age: 0, color: '#FF5D5D' })
          } else {
            g.combo += 1
            g.multiplier = Math.min(3, 1 + Math.floor(g.combo / 5) * 0.5)
            const pts = Math.round(ITEM_META[item.kind].points * g.multiplier)
            g.score += pts
            if (item.kind === 'star') sfx.coin()
            else sfx.pop()
            g.floats.push({
              x: drawX,
              y: item.y,
              text: `+${pts}${g.multiplier > 1 ? ` ×${g.multiplier}` : ''}`,
              age: 0,
              color: item.kind === 'star' ? '#FFD700' : '#7DE9FF',
            })
            for (let i = 0; i < 8; i++) {
              g.particles.push({
                x: drawX,
                y: item.y,
                vx: (Math.random() - 0.5) * 160,
                vy: -Math.random() * 140 - 30,
                age: 0,
                color: item.kind === 'star' ? '#FFD700' : '#00D4FF',
              })
            }
          }
          return false
        }
        return item.y < g.height + 40
      })

      // particles
      g.particles = g.particles.filter((p) => {
        p.age += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 300 * dt
        ctx.globalAlpha = Math.max(0, 1 - p.age * 2.2)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
        ctx.globalAlpha = 1
        return p.age < 0.5
      })

      // float texts
      g.floats = g.floats.filter((f) => {
        f.age += dt
        ctx.globalAlpha = Math.max(0, 1 - f.age * 1.4)
        ctx.fillStyle = f.color
        ctx.font = 'bold 16px Fredoka, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(f.text, f.x, f.y - f.age * 44)
        ctx.globalAlpha = 1
        return f.age < 0.8
      })

      drawHero(g)
      ctx.restore()

      // HUD
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 22px Fredoka, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(String(g.score), 16, 34)
      if (g.multiplier > 1) {
        ctx.fillStyle = '#FFD700'
        ctx.font = 'bold 14px Fredoka, sans-serif'
        ctx.fillText(`COMBO ×${g.multiplier}`, 16, 54)
      }
      ctx.textAlign = 'right'
      ctx.font = '18px sans-serif'
      ctx.fillText('🛡️'.repeat(Math.max(0, g.shields)), g.width - 12, 34)
      // time bar
      const frac = Math.max(0, g.timeLeft / GAME_SECONDS)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(16, g.height - 14, g.width - 32, 6)
      ctx.fillStyle = frac < 0.2 ? '#FF5D5D' : '#00D4FF'
      ctx.fillRect(16, g.height - 14, (g.width - 32) * frac, 6)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [endRun, suit])

  return (
    <div className="relative mx-auto flex h-dvh max-w-lg flex-col bg-navy-950">
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900/80 text-lg backdrop-blur"
          onClick={() => navigate('/avatar')}
          aria-label="Terug"
        >
          ✕
        </button>
        <span className="rounded-full bg-navy-900/80 px-3 py-1.5 font-display text-sm font-semibold text-gold-400 backdrop-blur">
          ⚡ {tokens} tokens
        </span>
      </div>

      <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Fuel Rush spel" />

      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-navy-950/70 p-6 text-center backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.h1
              className="font-display text-5xl font-bold text-electric-400"
              initial={{ y: 30, scale: 0.8 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            >
              FUEL RUSH
            </motion.h1>
            <p className="max-w-xs text-slate-300">
              Vang <strong>⚡ bliksems</strong>, <strong>⭐ sterren</strong> en{' '}
              <strong>🍎 powerfruit</strong>. Ontwijk <strong>☄️ meteoren</strong>!
              Sleep met je duim of gebruik de pijltjes.
            </p>
            <p className="text-sm text-slate-400">
              Beste score: <strong className="text-gold-400">{gear.stats.hiscore}</strong>
            </p>
            {tokens > 0 ? (
              <button className="btn-hero w-full max-w-xs text-xl" onClick={() => void beginRun()}>
                Start! (kost 1 ⚡token)
              </button>
            ) : (
              <div className="glass-card max-w-xs p-4">
                <p className="font-display text-gold-400">Geen tokens meer!</p>
                <p className="mt-1 text-sm text-slate-300">
                  Log brandstof om nieuwe speel-tokens te verdienen — elke missie is er één.
                </p>
                <button className="btn-gold mt-3 w-full" onClick={() => navigate('/add')}>
                  Brandstof loggen ⚡
                </button>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'paused' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-navy-950/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="font-display text-3xl">Gepauzeerd ⏸️</h2>
            <button className="btn-hero" onClick={() => setPhase('playing')}>
              Verder spelen
            </button>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-navy-950/80 p-6 text-center backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="font-display text-4xl text-electric-400">
              {finalScore >= 100 ? 'SUPERVLUCHT! 🚀' : 'Goed gevlogen! 🦸'}
            </h2>
            {isNewHiscore && (
              <motion.p
                className="font-display text-xl text-gold-400"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                🏆 NIEUW RECORD!
              </motion.p>
            )}
            <p className="font-display text-6xl font-bold">{finalScore}</p>
            <p className="text-slate-300">
              {coinsWon === null ? '…' : (
                <>
                  Verdiend: <strong className="text-gold-400">🪙 {coinsWon} munten</strong> · +10 XP
                </>
              )}
            </p>
            <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
              {tokens > 0 && (
                <button className="btn-hero" onClick={() => void beginRun()}>
                  Nog een keer! ({tokens} ⚡)
                </button>
              )}
              <button className="btn-ghost" onClick={() => navigate('/avatar')}>
                Terug naar je basis
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
