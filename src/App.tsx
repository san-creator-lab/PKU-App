import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { useAppStore } from '@/hooks/useAppStore'
import { AddFoodScreen } from '@/screens/AddFoodScreen'
import { AvatarRoomScreen } from '@/screens/AvatarRoomScreen'
import { BadgeHallScreen } from '@/screens/BadgeHallScreen'
import { HeroDashboard } from '@/screens/HeroDashboard'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { OnboardingScreen } from '@/screens/OnboardingScreen'

// Heavy screens are lazy: recharts (HQ/history) and tesseract (scanner)
// stay out of the initial bundle for fast loads on older phones.
const ScannerScreen = lazy(() =>
  import('@/screens/ScannerScreen').then((m) => ({ default: m.ScannerScreen })),
)
const SidekickDashboard = lazy(() =>
  import('@/screens/SidekickDashboard').then((m) => ({ default: m.SidekickDashboard })),
)
const HistoryScreen = lazy(() =>
  import('@/screens/HistoryScreen').then((m) => ({ default: m.HistoryScreen })),
)
const SettingsScreen = lazy(() =>
  import('@/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
)

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="animate-pulse font-display text-3xl text-gold-500">
        Hero Fuel ⚡
      </div>
    </div>
  )
}

export default function App() {
  const bootStatus = useAppStore((s) => s.bootStatus)
  const freshFamilyCode = useAppStore((s) => s.freshFamilyCode)
  const boot = useAppStore((s) => s.boot)

  useEffect(() => {
    void boot()
  }, [boot])

  if (bootStatus === 'booting') return <Splash />
  if (bootStatus !== 'ready' || freshFamilyCode) return <OnboardingScreen />

  return (
    <HashRouter>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/scan" element={<ScannerScreen />} />
          <Route element={<AppShell />}>
            <Route index element={<HeroDashboard />} />
            <Route path="/add" element={<AddFoodScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/badges" element={<BadgeHallScreen />} />
            <Route path="/avatar" element={<AvatarRoomScreen />} />
            <Route path="/hq" element={<SidekickDashboard />} />
            <Route path="/hq/history" element={<HistoryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
