import { useEffect, useRef } from 'react'
import { todayISO } from '@/lib/dates'
import { dayTotal, zoneFor } from '@/lib/gamification'
import { heroProfileOf, useAppStore } from './useAppStore'

/**
 * Device-local alerts (V1 — no push server): while the app is open, notify
 * when the hero's budget is nearly full and when nothing was logged by
 * 18:00. Uses the Notification API when granted, falls back silently.
 */

export interface AlertPrefs {
  nearLimit: boolean
  noLogByEvening: boolean
}

const PREFS_KEY = 'hero-fuel-alert-prefs'

export function getAlertPrefs(): AlertPrefs {
  try {
    return {
      nearLimit: false,
      noLogByEvening: false,
      ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}'),
    }
  } catch {
    return { nearLimit: false, noLogByEvening: false }
  }
}

export function setAlertPrefs(prefs: AlertPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

function notify(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/pwa-192x192.png' })
      return
    } catch {
      // some webviews throw; fall through
    }
  }
}

export function useAlerts() {
  const entries = useAppStore((s) => s.entries)
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const firedRef = useRef<{ nearLimit: string | null; evening: string | null }>({
    nearLimit: null,
    evening: null,
  })

  // near-limit alert, at most once per day
  useEffect(() => {
    const prefs = getAlertPrefs()
    if (!prefs.nearLimit) return
    const hero = heroProfileOf({ familyProfiles, myProfile })
    if (!hero) return
    const today = todayISO()
    const total = dayTotal(entries, today)
    const zone = zoneFor(total, Number(hero.daily_protein_limit))
    if ((zone === 'red' || zone === 'over') && firedRef.current.nearLimit !== today) {
      firedRef.current.nearLimit = today
      notify(
        'Hero Fuel ⚡',
        zone === 'red'
          ? `Let op: nog ${(Number(hero.daily_protein_limit) - total).toFixed(1).replace('.', ',')} g budget over vandaag.`
          : 'Het budget van vandaag is vol. Morgen een nieuwe missie!',
      )
    }
  }, [entries, myProfile, familyProfiles])

  // 18:00 no-log reminder, checked every 10 minutes while open
  useEffect(() => {
    const check = () => {
      const prefs = getAlertPrefs()
      if (!prefs.noLogByEvening) return
      const today = todayISO()
      if (new Date().getHours() < 18 || firedRef.current.evening === today) return
      const hasEntries = useAppStore.getState().entries.some((e) => e.date === today)
      if (!hasEntries) {
        firedRef.current.evening = today
        notify('Hero Fuel ⚡', 'Nog geen missies gelogd vandaag. Alles goed daar, held?')
      }
    }
    check()
    const id = setInterval(check, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [])
}
