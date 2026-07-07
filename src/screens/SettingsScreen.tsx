import { useState } from 'react'
import { Link } from 'react-router-dom'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { getAlertPrefs, setAlertPrefs } from '@/hooks/useAlerts'
import { backend } from '@/lib/backend'
import { entriesToCsv, downloadCsv } from '@/lib/csv'
import { addDays, todayISO } from '@/lib/dates'
import { t, type Lang } from '@/lib/i18n'

export function SettingsScreen() {
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const family = useAppStore((s) => s.family)
  const entries = useAppStore((s) => s.entries)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const lang = useAppStore((s) => s.lang)
  const largeText = useAppStore((s) => s.largeText)
  const setLargeText = useAppStore((s) => s.setLargeText)
  const signOut = useAppStore((s) => s.signOut)

  const hero = heroProfileOf({ familyProfiles, myProfile })
  const isSidekick = myProfile?.role === 'sidekick'
  const limit = Number(hero?.daily_protein_limit ?? 8)

  const [name, setName] = useState(myProfile?.display_name ?? '')
  const [alerts, setAlerts] = useState(getAlertPrefs())
  const [exporting, setExporting] = useState(false)

  async function adjustLimit(delta: number) {
    if (!hero || !isSidekick) return
    const next = Math.min(30, Math.max(1, Math.round((limit + delta) * 2) / 2))
    await updateProfile(hero.id, { daily_protein_limit: next })
  }

  async function exportCsv() {
    setExporting(true)
    try {
      // full year for the dietitian, straight from the backend
      const rows = await backend
        .listEntries(addDays(todayISO(), -365), todayISO())
        .catch(() => entries)
      downloadCsv(
        `hero-fuel-export-${todayISO()}.csv`,
        entriesToCsv(rows, familyProfiles),
      )
    } finally {
      setExporting(false)
    }
  }

  function toggleAlert(key: 'nearLimit' | 'noLogByEvening') {
    const next = { ...alerts, [key]: !alerts[key] }
    setAlerts(next)
    setAlertPrefs(next)
    if ((next.nearLimit || next.noLogByEvening) && 'Notification' in window) {
      void Notification.requestPermission()
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center gap-3">
        <Link to={isSidekick ? '/hq' : '/'} className="text-2xl" aria-label={t('common.back')}>
          ←
        </Link>
        <h1 className="font-display text-3xl">{t('settings.title')} ⚙️</h1>
      </header>

      {/* profile */}
      <section className="glass-card flex flex-col gap-3 p-4" aria-label="Profiel">
        <h2 className="font-display text-lg">Profiel</h2>
        <label className="text-xs font-semibold text-slate-300" htmlFor="s-name">
          {t('auth.yourName')}
        </label>
        <div className="flex gap-2">
          <input id="s-name" className="input-hero flex-1" value={name}
            onChange={(e) => setName(e.target.value)} maxLength={40} />
          <button
            className="btn-ghost px-4"
            disabled={!name.trim() || name === myProfile?.display_name}
            onClick={() => myProfile && void updateProfile(myProfile.id, { display_name: name.trim() })}
          >
            {t('common.save')}
          </button>
        </div>
      </section>

      {/* fuel budget */}
      <section className="glass-card flex flex-col gap-2 p-4" aria-label="Brandstof-budget">
        <h2 className="font-display text-lg">{t('settings.limit')}</h2>
        <div className="flex items-center justify-center gap-4">
          <button className="btn-ghost h-14 w-14 p-0 text-2xl" onClick={() => void adjustLimit(-0.5)}
            disabled={!isSidekick} aria-label="Budget verlagen">−</button>
          <output className="font-display text-4xl font-bold text-gold-500">
            {limit.toFixed(1).replace('.', ',')} g
          </output>
          <button className="btn-ghost h-14 w-14 p-0 text-2xl" onClick={() => void adjustLimit(0.5)}
            disabled={!isSidekick} aria-label="Budget verhogen">+</button>
        </div>
        <p className="text-center text-xs text-slate-400">
          {isSidekick
            ? 'Stel dit in samen met jullie diëtist.'
            : 'Alleen je sidekicks kunnen dit aanpassen.'}
        </p>
      </section>

      {/* family */}
      <section className="glass-card flex flex-col gap-2 p-4" aria-label={t('settings.family')}>
        <h2 className="font-display text-lg">{t('settings.family')} 🛡️</h2>
        {family && (
          <div className="text-center">
            <p className="text-xs text-slate-400">Teamcode voor nieuwe apparaten:</p>
            <p className="font-display text-3xl font-bold tracking-[0.3em] text-electric-400">
              {family.family_code}
            </p>
          </div>
        )}
        <ul className="mt-1 flex flex-col gap-1">
          {familyProfiles.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true">{p.role === 'hero' ? '🦸' : '🧢'}</span>
              <span className="flex-1">{p.display_name}</span>
              <span className="text-xs text-slate-400">
                {p.role === 'hero' ? 'Held' : 'Sidekick'}
                {p.id === myProfile?.id ? ' (jij)' : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* preferences */}
      <section className="glass-card flex flex-col gap-3 p-4" aria-label="Voorkeuren">
        <h2 className="font-display text-lg">Voorkeuren</h2>

        <div className="flex items-center justify-between gap-2">
          <label htmlFor="s-lang" className="text-sm">{t('settings.language')}</label>
          <select
            id="s-lang"
            className="input-hero w-40"
            value={lang}
            onChange={(e) => void setLanguage(e.target.value as Lang)}
          >
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </select>
        </div>

        <ToggleRow
          id="s-large"
          label={t('settings.largeText')}
          checked={largeText}
          onChange={() => setLargeText(!largeText)}
        />

        <h3 className="mt-1 text-sm font-semibold text-slate-300">
          {t('settings.notifications')} <span className="font-normal text-slate-500">(op dit apparaat, als de app open is)</span>
        </h3>
        <ToggleRow
          id="s-alert-limit"
          label="Waarschuw bij bijna-vol budget"
          checked={alerts.nearLimit}
          onChange={() => toggleAlert('nearLimit')}
        />
        <ToggleRow
          id="s-alert-evening"
          label="Herinner als er om 18:00 nog niks gelogd is"
          checked={alerts.noLogByEvening}
          onChange={() => toggleAlert('noLogByEvening')}
        />
      </section>

      {/* export */}
      <section className="glass-card flex flex-col gap-2 p-4" aria-label="Export">
        <h2 className="font-display text-lg">Voor de diëtist</h2>
        <button className="btn-gold" disabled={exporting} onClick={() => void exportCsv()}>
          {exporting ? t('common.loading') : `📄 ${t('settings.export')}`}
        </button>
        <p className="text-xs text-slate-400">{t('settings.disclaimer')}</p>
      </section>

      <button className="btn-ghost text-hero-400" onClick={() => void signOut()}>
        {t('settings.logout')}
      </button>

      <p className="text-center text-xs text-slate-600">
        Hero Fuel v1.0 · modus: {backend.kind === 'local' ? 'lokaal (demo/offline)' : 'Supabase'}
      </p>
    </div>
  )
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm">{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        className={`relative h-8 w-14 rounded-full transition ${
          checked ? 'bg-electric-500' : 'bg-white/15'
        }`}
        onClick={onChange}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}
