import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ShortcutGroup {
    title: string
    shortcuts: { keys: string[]; description: string }[]
}

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
const mod = isMac ? '\u2318' : 'Ctrl'

const groups: ShortcutGroup[] = [
    {
        title: 'General',
        shortcuts: [
            { keys: ['?'], description: 'Toggle this shortcuts panel' },
            { keys: [mod, 'Z'], description: 'Undo' },
            { keys: [mod, 'Shift', 'Z'], description: 'Redo' },
        ]
    },
    {
        title: 'Canvas',
        shortcuts: [
            { keys: ['Space'], description: 'Hold to pan (grab mode)' },
            { keys: ['Scroll'], description: 'Zoom in/out' },
            { keys: ['Alt', 'Click'], description: 'Pan the canvas' },
            { keys: ['Middle Click'], description: 'Pan the canvas' },
        ]
    },
    {
        title: 'Data Table',
        shortcuts: [
            { keys: ['Tab'], description: 'Next concentration cell' },
            { keys: ['Shift', 'Tab'], description: 'Previous cell' },
            { keys: ['\u2191', '\u2193'], description: 'Navigate rows' },
            { keys: [mod, 'V'], description: 'Paste multi-row data' },
        ]
    },
    {
        title: 'Touch Gestures',
        shortcuts: [
            { keys: ['Pinch'], description: 'Zoom in/out' },
            { keys: ['1-finger drag'], description: 'Draw or pan' },
            { keys: ['2-finger drag'], description: 'Pan the canvas' },
        ]
    }
]

export function KeyboardShortcuts({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-card border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-sm font-semibold">Keyboard Shortcuts</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {groups.map(group => (
                        <div key={group.title}>
                            <h3 className="text-xs font-medium text-muted-foreground mb-2">{group.title}</h3>
                            <div className="space-y-1.5">
                                {group.shortcuts.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{s.description}</span>
                                        <div className="flex items-center gap-1">
                                            {s.keys.map((key, j) => (
                                                <span key={j}>
                                                    {j > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
                                                    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-mono bg-muted border rounded">
                                                        {key}
                                                    </kbd>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t text-center">
                    <span className="text-[10px] text-muted-foreground">Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted border rounded">?</kbd> or <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted border rounded">Esc</kbd> to close</span>
                </div>
            </div>
        </div>
    )
}
