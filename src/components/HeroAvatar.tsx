import { motion } from 'framer-motion'
import type { PowerZone } from '@/lib/gamification'

export type AvatarState = 'charging' | PowerZone

interface Props {
  state: AvatarState
  level: number
  size?: number
}

/**
 * The evolving hero. Pure layered SVG — no external assets. Gear appears
 * with levels (5 cape, 10 mask, 15 shield, 20 armor, 25 gold, 30 cosmic);
 * pose/expression react to today's fuel zone. Over-limit is deliberately
 * gentle: tired, never sad or punishing.
 */
export function HeroAvatar({ state, level, size = 180 }: Props) {
  const hasCape = level >= 5
  const hasMaskUpgrade = level >= 10
  const hasShieldGear = level >= 15
  const hasArmor = level >= 20
  const golden = level >= 25
  const cosmic = level >= 30

  const charging = state === 'charging'
  const tired = state === 'over'
  const alert = state === 'yellow' || state === 'red'
  const showShield = hasShieldGear || alert

  const suit = cosmic ? '#7B5CFF' : golden ? '#FFD700' : '#00D4FF'
  const suitDark = cosmic ? '#5A3FD6' : golden ? '#D4AF00' : '#00A8CC'
  const capeColor = cosmic ? '#B9A6FF' : '#FFD700'
  const skin = '#FFD7B8'
  const emblem = golden && !cosmic ? '#0F1B2D' : '#FFD700'

  const glow = charging
    ? 'none'
    : state === 'green'
      ? 'drop-shadow(0 0 14px rgba(0,212,255,0.55))'
      : state === 'yellow'
        ? 'drop-shadow(0 0 12px rgba(255,201,60,0.5))'
        : state === 'red'
          ? 'drop-shadow(0 0 12px rgba(255,93,93,0.5))'
          : 'drop-shadow(0 0 6px rgba(139,148,168,0.4))'

  return (
    <motion.div
      style={{ width: size, height: size * 1.2, filter: glow }}
      className="relative"
      animate={
        tired
          ? { x: [0, -3, 3, -2, 2, 0], y: 0 }
          : { y: [0, -5, 0] }
      }
      transition={
        tired
          ? { duration: 0.6, ease: 'easeInOut' }
          : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <svg
        viewBox="0 0 200 240"
        width={size}
        height={size * 1.2}
        aria-hidden="true"
        style={charging ? { filter: 'grayscale(0.9)', opacity: 0.6 } : undefined}
      >
        <defs>
          <radialGradient id="aura" cx="0.5" cy="0.45" r="0.55">
            <stop offset="0%" stopColor={cosmic ? '#B9A6FF' : '#FFD700'} stopOpacity="0.35" />
            <stop offset="100%" stopColor={cosmic ? '#B9A6FF' : '#FFD700'} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={suit} />
            <stop offset="100%" stopColor={suitDark} />
          </linearGradient>
        </defs>

        {(golden || cosmic) && <circle cx="100" cy="110" r="95" fill="url(#aura)" />}

        {cosmic && (
          <g fill="#FFE14D">
            <motion.circle cx="30" cy="50" r="3"
              animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.8, repeat: Infinity }} />
            <motion.circle cx="172" cy="70" r="2.5"
              animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2.2, repeat: Infinity }} />
            <motion.circle cx="160" cy="30" r="2"
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
          </g>
        )}

        {/* cape (level 5+) — flows in green, hangs when tired */}
        {hasCape && (
          <motion.path
            d={
              tired
                ? 'M63 92 Q52 150 58 196 Q100 188 142 196 Q148 150 137 92 Z'
                : 'M63 92 Q40 150 30 190 Q80 176 100 188 Q120 176 170 190 Q160 150 137 92 Z'
            }
            fill={capeColor}
            opacity={0.92}
            style={{ transformOrigin: '100px 95px' }}
            animate={
              state === 'green'
                ? { rotate: [0, 2.5, 0, -2.5, 0] }
                : { rotate: 0 }
            }
            transition={{ duration: 2.4, repeat: state === 'green' ? Infinity : 0 }}
          />
        )}

        {/* legs + boots */}
        <rect x="78" y="168" width="16" height="40" rx="8" fill="url(#suitGrad)" />
        <rect x="106" y="168" width="16" height="40" rx="8" fill="url(#suitGrad)" />
        <rect x="74" y="200" width="24" height="14" rx="7" fill="#FFD700" />
        <rect x="102" y="200" width="24" height="14" rx="7" fill="#FFD700" />

        {/* arms — droop when tired */}
        <motion.rect
          x="52" y="100" width="16" height="48" rx="8" fill="url(#suitGrad)"
          style={{ transformOrigin: '60px 104px' }}
          animate={{ rotate: tired ? 18 : showShield ? -12 : 8 }}
        />
        <motion.rect
          x="132" y="100" width="16" height="48" rx="8" fill="url(#suitGrad)"
          style={{ transformOrigin: '140px 104px' }}
          animate={{ rotate: tired ? -18 : -8 }}
        />

        {/* torso */}
        <path d="M66 92 Q100 82 134 92 L128 172 Q100 180 72 172 Z" fill="url(#suitGrad)" />

        {/* armor (level 20+) */}
        {hasArmor && (
          <g>
            <path d="M62 90 Q76 82 84 88 L80 104 Q68 102 62 96 Z" fill="#FFD700" />
            <path d="M138 90 Q124 82 116 88 L120 104 Q132 102 138 96 Z" fill="#FFD700" />
            <path d="M74 150 Q100 158 126 150 L124 162 Q100 170 76 162 Z"
              fill="#FFD700" opacity="0.85" />
          </g>
        )}

        {/* chest emblem */}
        <circle cx="100" cy="120" r="17" fill={charging ? '#4A5568' : '#0F1B2D'}
          stroke={emblem} strokeWidth="3" />
        <motion.path
          d="M104 108 L92 124 L99 124 L96 134 L108 118 L101 118 Z"
          fill={charging ? '#8B94A8' : emblem}
          animate={charging ? { opacity: [0.3, 0.9, 0.3] } : { opacity: 1 }}
          transition={charging ? { duration: 1.6, repeat: Infinity } : undefined}
        />

        {/* shield (alert zones or level 15+) */}
        {showShield && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ transformOrigin: '52px 130px' }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <circle cx="50" cy="132" r="22" fill="#16263D" stroke="#FFD700" strokeWidth="4" />
            <circle cx="50" cy="132" r="12" fill="none" stroke="#00D4FF" strokeWidth="2.5" />
            <path d="M52 124 L45 133 L49 133 L47 140 L55 130 L50.5 130 Z" fill="#FFD700" />
          </motion.g>
        )}

        {/* head */}
        <circle cx="100" cy="56" r="34" fill={skin} />
        {/* hair */}
        <path d="M70 46 Q74 22 100 22 Q126 22 130 46 Q116 34 100 36 Q84 34 70 46 Z" fill="#2B2118" />

        {/* mask — domino (basic) or winged (level 10+) */}
        {hasMaskUpgrade ? (
          <path
            d="M64 48 Q78 40 100 42 Q122 40 136 48 Q136 60 122 62 Q110 63 100 58 Q90 63 78 62 Q64 60 64 48 Z"
            fill={cosmic ? '#5A3FD6' : '#0F1B2D'} stroke={suit} strokeWidth="2"
          />
        ) : (
          <path
            d="M72 48 Q100 42 128 48 Q128 58 100 56 Q72 58 72 48 Z"
            fill="#0F1B2D"
          />
        )}

        {/* eyes */}
        {charging || tired ? (
          <g stroke="#2B2118" strokeWidth="2.5" strokeLinecap="round">
            <path d="M84 53 Q88 56 92 53" fill="none" />
            <path d="M108 53 Q112 56 116 53" fill="none" />
          </g>
        ) : (
          <g>
            <circle cx="88" cy="52" r="4.5" fill="white" />
            <circle cx="112" cy="52" r="4.5" fill="white" />
            <circle cx="89" cy="52.5" r="2.2" fill="#0F1B2D" />
            <circle cx="113" cy="52.5" r="2.2" fill="#0F1B2D" />
          </g>
        )}

        {/* mouth per state */}
        {state === 'green' && (
          <path d="M88 68 Q100 78 112 68" stroke="#C2410C" strokeWidth="3"
            strokeLinecap="round" fill="none" />
        )}
        {state === 'yellow' && (
          <path d="M90 71 L110 71" stroke="#C2410C" strokeWidth="3" strokeLinecap="round" />
        )}
        {state === 'red' && (
          <path d="M90 72 Q100 68 110 72" stroke="#C2410C" strokeWidth="3"
            strokeLinecap="round" fill="none" />
        )}
        {(state === 'over' || charging) && (
          <ellipse cx="100" cy="71" rx="6" ry="4" fill="#C2410C" opacity="0.8" />
        )}

        {/* tired sweat drop — sympathetic, not sad */}
        {tired && (
          <motion.path
            d="M132 40 Q136 46 132 50 Q128 46 132 40 Z" fill="#7DE9FF"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 2 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </svg>

      {charging && (
        <motion.div
          className="absolute -right-1 top-2 font-display text-xl text-slate-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ⚡…
        </motion.div>
      )}
    </motion.div>
  )
}
