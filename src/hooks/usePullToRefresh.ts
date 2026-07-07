import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 72

/**
 * Touch pull-to-refresh for the dashboard: pull past the threshold at
 * scroll-top to trigger `onRefresh` with a hero-recharge spinner.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const refreshingRef = useRef(false)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY <= 0 && !refreshingRef.current) {
        startY.current = e.touches[0].clientY
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || refreshingRef.current) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0 && window.scrollY <= 0) {
        setPull(Math.min(delta * 0.45, THRESHOLD * 1.4))
      }
    }
    async function onTouchEnd() {
      if (startY.current === null) return
      startY.current = null
      setPull((current) => {
        if (current >= THRESHOLD && !refreshingRef.current) {
          refreshingRef.current = true
          setRefreshing(true)
          void onRefresh().finally(() => {
            refreshingRef.current = false
            setRefreshing(false)
            setPull(0)
          })
          return THRESHOLD
        }
        return 0
      })
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh])

  return { pull, refreshing }
}
