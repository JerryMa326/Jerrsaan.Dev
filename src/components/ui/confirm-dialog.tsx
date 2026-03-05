import { useEffect, useRef } from 'react'
import { Button } from './button'

interface ConfirmDialogProps {
    open: boolean
    message: string
    onConfirm: () => void
    onCancel: () => void
    confirmText?: string
    cancelText?: string
    destructive?: boolean
}

export function ConfirmDialog({
    open,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    destructive = false
}: ConfirmDialogProps) {
    const confirmRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (open) confirmRef.current?.focus()
    }, [open])

    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [open, onCancel])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-card border rounded-xl shadow-2xl p-5 max-w-sm mx-4 space-y-4 animate-in zoom-in-95 duration-150">
                <p className="text-sm">{message}</p>
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button
                        ref={confirmRef}
                        size="sm"
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    )
}
