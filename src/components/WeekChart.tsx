import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FoodEntry } from '@/lib/backend'
import { addDays, formatShortNL, todayISO } from '@/lib/dates'
import { dayTotal, ZONE_COLORS, zoneFor } from '@/lib/gamification'

interface Props {
  entries: FoodEntry[]
  limit: number
  days: number
}

/** Daily protein bars + rolling average line vs. the limit. */
export function WeekChart({ entries, limit, days }: Props) {
  const today = todayISO()
  const data = Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - 1 - i))
    const total = Math.round(dayTotal(entries, date) * 10) / 10
    return {
      date,
      label: formatShortNL(date),
      total,
      color: ZONE_COLORS[zoneFor(total, limit)],
    }
  }).map((d, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1)
    const avg = window.reduce((s, x) => s + x.total, 0) / window.length
    return { ...d, avg: Math.round(avg * 10) / 10 }
  })

  return (
    <div className="h-56 w-full" role="img"
      aria-label={`Grafiek van eiwit-inname per dag over ${days} dagen`}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8B94A8', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            interval={days > 14 ? 4 : 1}
          />
          <YAxis
            tick={{ fill: '#8B94A8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[0, Math.max(limit * 1.4, 10)]}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{
              background: '#16263D',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              color: '#E2E8F0',
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              `${String(value).replace('.', ',')} g`,
              name === 'total' ? 'eiwit' : 'gemiddelde (7d)',
            ]}
            labelFormatter={(label) => String(label)}
          />
          <ReferenceLine
            y={limit}
            stroke="#FFD700"
            strokeDasharray="6 4"
            label={{ value: 'budget', fill: '#FFD700', fontSize: 10, position: 'right' }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} isAnimationActive={false}
            // per-day zone colors
            fill="#00D4FF"
            shape={(props: unknown) => {
              const p = props as { x: number; y: number; width: number; height: number; payload: { color: string } }
              return (
                <rect x={p.x} y={p.y} width={p.width} height={Math.max(p.height, 0)}
                  rx={4} fill={p.payload.color} opacity={0.85} />
              )
            }}
          />
          <Line type="monotone" dataKey="avg" stroke="#7DE9FF" strokeWidth={2}
            dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
