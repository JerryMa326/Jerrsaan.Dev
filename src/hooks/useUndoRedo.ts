import { useState, useCallback, useRef } from 'react'
import type { Shape } from '@/types'

const MAX_HISTORY = 50

export function useUndoRedo() {
    const [past, setPast] = useState<Shape[][]>([])
    const [future, setFuture] = useState<Shape[][]>([])
    const skipNextRef = useRef(false)

    const pushState = useCallback((shapes: Shape[]) => {
        if (skipNextRef.current) {
            skipNextRef.current = false
            return
        }
        setPast(prev => {
            const next = [...prev, shapes]
            if (next.length > MAX_HISTORY) next.shift()
            return next
        })
        setFuture([])
    }, [])

    const undo = useCallback((currentShapes: Shape[]): Shape[] | null => {
        if (past.length === 0) return null
        const prev = past[past.length - 1]
        setPast(p => p.slice(0, -1))
        setFuture(f => [...f, currentShapes])
        skipNextRef.current = true
        return prev
    }, [past])

    const redo = useCallback((currentShapes: Shape[]): Shape[] | null => {
        if (future.length === 0) return null
        const next = future[future.length - 1]
        setFuture(f => f.slice(0, -1))
        setPast(p => [...p, currentShapes])
        skipNextRef.current = true
        return next
    }, [future])

    const canUndo = past.length > 0
    const canRedo = future.length > 0

    return { pushState, undo, redo, canUndo, canRedo }
}
