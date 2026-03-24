import { useState, useEffect, useCallback } from 'react'

interface SWState {
  isOffline: boolean
  hasUpdate: boolean
  dismissUpdate: () => void
}

export function useServiceWorker(): SWState {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [hasUpdate, setHasUpdate] = useState(false)

  const dismissUpdate = useCallback(() => setHasUpdate(false), [])

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for SW updates every 60 seconds
          setInterval(() => registration.update(), 60_000)
        })
        .catch((err) => console.warn('SW registration failed:', err))

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          setHasUpdate(true)
        }
      })
    }

    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  return { isOffline, hasUpdate, dismissUpdate }
}
