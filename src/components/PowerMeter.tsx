import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { zoneFor, ZONE_COLORS, type PowerZone } from '@/lib/gamification'
import { t } from '@/lib/i18n'

interface Props {
  total: number
  limit: number
  size?: number
}

// Gauge geometry: 240° sweep starting at 150° (7-8 o'clock) — classic dial.
const START = 150
const SWEEP = 240

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const start = polar(cx, cy, r, from)
  const end = polar(cx, cy, r, to)
  const large = to - from > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

/**
 * THE hero element: an animated arc gauge of today's fuel. Zone segments sit
 * behind a bright animated progress arc; the number springs to new values.
 */
export function PowerMeter({ total, limit, size = 280 }: Props) {
  const zone: PowerZone = zoneFor(total, limit)
  const color = ZONE_COLORS[zone]
  const progress = Math.min(total / limit, 1)

  const spring = useSpring(0, { stiffness: 60, damping: 15 })
  useEffect(() => {
    spring.set(progress)
  }, [progress, spring])

  const numberSpring = useSpring(0, { stiffness: 80, damping: 20 })
  useEffect(() => {
    numberSpring.set(total)
  }, [total, numberSpring])
  const displayNumber = useTransform(numberSpring, (v) => v.toFixed(1).replace('.', ','))

  const dashOffset = useTransform(spring, (p) => 1 - p)

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 22

  // zone boundaries as fractions of the limit
  const zones: { from: number; to: number; color: string }[] = [
    { from: 0, to: 0.75, color: ZONE_COLORS.green },
    { from: 0.75, to: 0.875, color: ZONE_COLORS.yellow },
    { from: 0.875, to: 1, color: ZONE_COLORS.red },
  ]

  const pulseClass =
    zone === 'yellow' || zone === 'red' ? 'animate-pulse-glow rounded-full' : ''

  return (
    <div className={`relative inline-block ${pulseClass}`} role="img"
      aria-label={`${total.toFixed(1)} van ${limit.toFixed(1)} brandstofpunten gebruikt`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="meter-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* zone track segments */}
        {zones.map((z) => (
          <path
            key={z.from}
            d={arcPath(cx, cy, r, START + z.from * SWEEP, START + z.to * SWEEP)}
            fill="none"
            stroke={z.color}
            strokeOpacity={0.18}
            strokeWidth={16}
            strokeLinecap="round"
          />
        ))}

        {/* animated progress arc */}
        <motion.path
          d={arcPath(cx, cy, r, START, START + SWEEP)}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          filter="url(#meter-glow)"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ strokeDashoffset: dashOffset }}
        />

        {/* limit tick */}
        {(() => {
          const a = START + SWEEP
          const p1 = polar(cx, cy, r - 14, a)
          const p2 = polar(cx, cy, r + 14, a)
          return (
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FFD700"
              strokeWidth={3} strokeLinecap="round" opacity={0.9} />
          )
        })()}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-1 font-display">
          <motion.span className="text-6xl font-bold tabular-nums" style={{ color }}>
            {displayNumber}
          </motion.span>
        </div>
        <div className="mt-1 font-display text-lg text-slate-300">
          van {limit.toFixed(1).replace('.', ',')}
        </div>
        <div className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          {t('dash.units')}
        </div>
      </div>
    </div>
  )
}
