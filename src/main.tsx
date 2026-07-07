import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/900.css'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
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
