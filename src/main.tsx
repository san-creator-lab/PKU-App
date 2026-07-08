import React from 'react'
import ReactDOM from 'react-dom/client'
// latin + latin-ext cover the full NL/EN UI; skipping the other subsets
// keeps the PWA precache and the single-file demo small
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-ext-400.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-ext-700.css'
import '@fontsource/nunito/latin-900.css'
import '@fontsource/nunito/latin-ext-900.css'
import '@fontsource/fredoka/latin-500.css'
import '@fontsource/fredoka/latin-ext-500.css'
import '@fontsource/fredoka/latin-600.css'
import '@fontsource/fredoka/latin-ext-600.css'
import '@fontsource/fredoka/latin-700.css'
import '@fontsource/fredoka/latin-ext-700.css'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { useAppStore } from './hooks/useAppStore'

// autoUpdate service worker: new versions activate on next visit
registerSW({ immediate: true })

if (import.meta.env.DEV) {
  // test hook for Playwright verification scripts (dev builds only)
  const w = window as unknown as Record<string, unknown>
  w.__appStore = useAppStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
