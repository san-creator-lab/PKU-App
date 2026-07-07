import type { FoodEntry, Profile } from './backend/types'

/** CSV export for the dietitian: one row per logged entry. */
export function entriesToCsv(entries: FoodEntry[], profiles: Profile[]): string {
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.display_name ?? id
  const header = 'datum;tijd;eten;eiwit_gram;maaltijd;bron;gelogd_door'
  const rows = [...entries]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) =>
      [
        e.date,
        new Date(e.created_at).toLocaleTimeString('nl-NL', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        csvEscape(e.food_name),
        String(Number(e.protein_grams)).replace('.', ','),
        e.meal_type,
        e.source,
        csvEscape(nameOf(e.logged_by)),
      ].join(';'),
    )
  return [header, ...rows].join('\r\n')
}

function csvEscape(value: string): string {
  return /[;"\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel opens it with the right encoding
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
