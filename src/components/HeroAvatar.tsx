import { motion } from 'framer-motion'
import type { Gear } from '@/lib/economy'
import type { PowerZone } from '@/lib/gamification'

export type AvatarState = 'charging' | PowerZone

interface Props {
  state: AvatarState
  level: number
  size?: number
  /** Equipped shop cosmetics (suit color, helmet, cape, pet, aura). */
  gear?: Gear['equipped']
}

const SUITS: Record<string, { main: string; dark: string }> = {
  suit_classic: { main: '#00D4FF', dark: '#00A8CC' },
  suit_rood: { main: '#FF5A5A', dark: '#C93A3A' },
  suit_groen: { main: '#35D46A', dark: '#1F9E4B' },
  suit_zwart: { main: '#4A5568', dark: '#2D3748' },
}

const CAPES: Record<string, string> = {
  cape_geel: '#FFD700',
  cape_rood: '#FF5A5A',
  cape_sterren: '#3B4C9B',
}

/**
 * The evolving hero. Pure layered SVG — no external assets. Gear appears
 * with levels (5 cape, 10 mask, 15 shield, 20 armor, 25 gold, 30 cosmic);
 * pose/expression react to today's fuel zone. Over-limit is deliberately
 * gentle: tired, never sad or punishing.
 */
export function HeroAvatar({ state, level, size = 180, gear }: Props) {
  const equippedCape = gear?.cape && gear.cape !== 'cape_geel' ? gear.cape : null
  const hasCape = level >= 5 || equippedCape !== null
  const hasMaskUpgrade = level >= 10
  const hasShieldGear = level >= 15
  const hasArmor = level >= 20
  const golden = level >= 25
  const cosmic = level >= 30

  const charging = state === 'charging'
  const tired = state === 'over'
  const alert = state === 'yellow' || state === 'red'
  const showShield = hasShieldGear || alert

  const suitChoice = gear?.suit && gear.suit !== 'suit_classic' ? SUITS[gear.suit] : null
  const suit = suitChoice?.main ?? (cosmic ? '#7B5CFF' : golden ? '#FFD700' : '#00D4FF')
  const suitDark = suitChoice?.dark ?? (cosmic ? '#5A3FD6' : golden ? '#D4AF00' : '#00A8CC')
  const capeColor = equippedCape
    ? CAPES[equippedCape]
    : cosmic
      ? '#B9A6FF'
      : '#FFD700'
  const skin = '#FFD7B8'
  const emblem = golden && !cosmic && !suitChoice ? '#0F1B2D' : '#FFD700'
  const helmet = gear?.helmet ?? 'helm_klassiek'
  const aura = gear?.aura ?? null
  const pet = gear?.pet ?? null

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

        {(golden || cosmic) && aura !== 'aura_geen' && !aura && (
          <circle cx="100" cy="110" r="95" fill="url(#aura)" />
        )}

        {/* purchasable auras */}
        {aura === 'aura_bliksem' && (
          <g>
            <motion.circle
              cx="100" cy="112" r="88" fill="none" stroke="#00D4FF" strokeWidth="2.5"
              strokeDasharray="14 22" opacity="0.7"
              animate={{ rotate: 360 }}
              style={{ transformOrigin: '100px 112px' }}
              transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
            />
            {[30, 150, 270].map((deg) => (
              <motion.text
                key={deg}
                x={100 + 88 * Math.cos((deg * Math.PI) / 180)}
                y={116 + 88 * Math.sin((deg * Math.PI) / 180)}
                fontSize="14" textAnchor="middle"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: deg / 300 }}
              >
                ⚡
              </motion.text>
            ))}
          </g>
        )}
        {aura === 'aura_vuur' && (
          <motion.circle
            cx="100" cy="112" r="86" fill="none" stroke="#FF7A3C" strokeWidth="5"
            opacity="0.55"
            animate={{ r: [84, 90, 84], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        )}

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
        {/* star sprinkles on the star cape */}
        {hasCape && equippedCape === 'cape_sterren' && !tired && (
          <g fill="#FFE14D">
            {[[52, 130], [66, 160], [140, 145], [128, 172], [45, 168]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" />
            ))}
          </g>
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

        {/* headgear: classic mask (upgrades at level 10) or shop helmets */}
        {helmet === 'helm_klassiek' &&
          (hasMaskUpgrade ? (
            <path
              d="M64 48 Q78 40 100 42 Q122 40 136 48 Q136 60 122 62 Q110 63 100 58 Q90 63 78 62 Q64 60 64 48 Z"
              fill={cosmic ? '#5A3FD6' : '#0F1B2D'} stroke={suit} strokeWidth="2"
            />
          ) : (
            <path
              d="M72 48 Q100 42 128 48 Q128 58 100 56 Q72 58 72 48 Z"
              fill="#0F1B2D"
            />
          ))}
        {helmet === 'helm_vizier' && (
          <g>
            <path d="M68 46 Q100 40 132 46 L132 58 Q100 63 68 58 Z"
              fill="#0F1B2D" opacity="0.9" />
            <motion.path
              d="M70 50 Q100 45 130 50 L130 54 Q100 58 70 54 Z" fill="#00D4FF"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </g>
        )}
        {helmet === 'helm_ninja' && (
          <g>
            <path d="M66 44 Q100 38 134 44 L134 54 Q100 60 66 54 Z" fill="#1A2333" />
            <motion.path
              d="M132 48 Q150 52 156 64 L150 66 Q140 56 130 54 Z" fill="#1A2333"
              style={{ transformOrigin: '132px 50px' }}
              animate={{ rotate: [0, 6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          </g>
        )}
        {helmet === 'helm_ruimte' && (
          <g>
            <circle cx="100" cy="52" r="42" fill="#7DE9FF" opacity="0.16"
              stroke="#7DE9FF" strokeWidth="2.5" />
            <path d="M70 34 Q80 24 96 24" stroke="white" strokeWidth="3"
              strokeLinecap="round" fill="none" opacity="0.5" />
          </g>
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

        {/* companion pets */}
        {pet === 'pet_robo' && (
          <motion.g
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x="152" y="150" width="30" height="22" rx="9" fill="#8B94A8" />
            <rect x="158" y="136" width="20" height="16" rx="7" fill="#A8B2C4" />
            <rect x="161" y="141" width="14" height="5" rx="2.5" fill="#00D4FF" />
            <line x1="168" y1="136" x2="168" y2="129" stroke="#8B94A8" strokeWidth="2" />
            <circle cx="168" cy="127.5" r="2.5" fill="#FF5A5A" />
            <rect x="155" y="170" width="7" height="6" rx="3" fill="#6B7488" />
            <rect x="172" y="170" width="7" height="6" rx="3" fill="#6B7488" />
          </motion.g>
        )}
        {pet === 'pet_draak' && (
          <motion.g
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="166" cy="156" rx="16" ry="13" fill="#35D46A" />
            <circle cx="174" cy="146" r="9" fill="#4AE07C" />
            <circle cx="177" cy="144" r="2" fill="#0F1B2D" />
            <motion.path
              d="M154 150 Q144 140 150 132 Q158 138 158 148 Z" fill="#4AE07C"
              style={{ transformOrigin: '156px 148px' }}
              animate={{ rotate: [0, 14, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
            <motion.path
              d="M183 148 L190 146 L186 151 Z" fill="#FF7A3C"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          </motion.g>
        )}
        {pet === 'pet_uil' && (
          <motion.g
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="166" cy="152" rx="14" ry="17" fill="#9A6B3F" />
            <path d="M156 138 L160 130 L164 138 Z" fill="#9A6B3F" />
            <path d="M168 138 L172 130 L176 138 Z" fill="#9A6B3F" />
            <circle cx="160" cy="146" r="5.5" fill="white" />
            <circle cx="172" cy="146" r="5.5" fill="white" />
            <circle cx="161" cy="147" r="2.5" fill="#0F1B2D" />
            <circle cx="171" cy="147" r="2.5" fill="#0F1B2D" />
            <path d="M164 154 L166 158 L168 154 Z" fill="#FFB020" />
            <ellipse cx="166" cy="163" rx="8" ry="4" fill="#B8865A" />
          </motion.g>
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
