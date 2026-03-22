import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: number
    message: string
    type: ToastType
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = nextId++
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 3500)
        return () => clearTimeout(timer)
    }, [toast.id, onDismiss])

    const colors = {
        success: 'bg-green-900/90 border-green-700 text-green-100',
        error: 'bg-red-900/90 border-red-700 text-red-100',
        info: 'bg-neutral-800/90 border-neutral-600 text-neutral-100'
    }

    return (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-lg backdrop-blur-sm text-sm animate-in slide-in-from-right duration-200 ${colors[toast.type]}`}>
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used within ToastProvider')
    return context
}
