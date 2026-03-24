import { WifiOff, RefreshCw } from 'lucide-react'

interface PWAStatusProps {
  isOffline: boolean
  hasUpdate: boolean
  onDismissUpdate: () => void
}

export function PWAStatus({ isOffline, hasUpdate, onDismissUpdate }: PWAStatusProps) {
  if (!isOffline && !hasUpdate) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center gap-1 pointer-events-none">
      {isOffline && (
        <div className="mt-14 px-4 py-1.5 rounded-full bg-amber-900/90 border border-amber-700 text-amber-100 text-xs font-medium flex items-center gap-1.5 pointer-events-auto shadow-lg backdrop-blur-sm">
          <WifiOff className="h-3 w-3" />
          Offline — using cached version
        </div>
      )}
      {hasUpdate && !isOffline && (
        <div className="mt-14 px-4 py-1.5 rounded-full bg-blue-900/90 border border-blue-700 text-blue-100 text-xs font-medium flex items-center gap-1.5 pointer-events-auto shadow-lg backdrop-blur-sm">
          <RefreshCw className="h-3 w-3" />
          New version available
          <button
            onClick={() => window.location.reload()}
            className="ml-1 underline hover:no-underline"
          >
            Reload
          </button>
          <button onClick={onDismissUpdate} className="ml-1 opacity-60 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
