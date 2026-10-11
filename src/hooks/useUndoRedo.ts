import { useReducer, useCallback } from 'react'
import type { Shape } from '@/types'

const MAX_HISTORY = 50

export interface ShapeHistory {
    past: Shape[][]
    present: Shape[]
    future: Shape[][]
}

type ShapesUpdate = Shape[] | ((prev: Shape[]) => Shape[])

export type ShapeHistoryAction =
    | { type: 'edit'; update: ShapesUpdate }   // a user edit: one undo step
    | { type: 'reset'; update: ShapesUpdate }  // replace shapes and forget history
    | { type: 'undo' }
    | { type: 'redo' }

export const initialShapeHistory: ShapeHistory = { past: [], present: [], future: [] }

function applyUpdate(prev: Shape[], update: ShapesUpdate): Shape[] {
    return typeof update === 'function' ? update(prev) : update
}

/**
 * Shapes and their undo/redo stacks live in one state value, so an undo can
 * never get out of step with the shapes it restores.
 */
export function shapeHistoryReducer(state: ShapeHistory, action: ShapeHistoryAction): ShapeHistory {
    switch (action.type) {
        case 'edit': {
            const next = applyUpdate(state.present, action.update)
            if (next === state.present) return state
            return {
                past: [...state.past, state.present].slice(-MAX_HISTORY),
                present: next,
                future: []
            }
        }
        case 'reset':
            return { past: [], present: applyUpdate(state.present, action.update), future: [] }
        case 'undo': {
            if (state.past.length === 0) return state
            return {
                past: state.past.slice(0, -1),
                present: state.past[state.past.length - 1],
                future: [...state.future, state.present]
            }
        }
        case 'redo': {
            if (state.future.length === 0) return state
            return {
                past: [...state.past, state.present],
                present: state.future[state.future.length - 1],
                future: state.future.slice(0, -1)
            }
        }
    }
}

type ShortcutEvent = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey'> & {
    target: EventTarget | null
}

/**
 * Which shape history action a keydown means, if any. Typing fields keep their
 * own text undo, and Shift turns the key into 'Z' on Windows, Linux and Firefox.
 */
export function getUndoShortcut(e: ShortcutEvent): 'undo' | 'redo' | null {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return null
    const target = e.target as { tagName?: string; isContentEditable?: boolean } | null
    const tag = target?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return null
    return e.shiftKey ? 'redo' : 'undo'
}

export function useUndoRedo() {
    const [state, dispatch] = useReducer(shapeHistoryReducer, initialShapeHistory)

    // All of these keep the same identity for the life of the component
    const edit = useCallback((update: ShapesUpdate) => dispatch({ type: 'edit', update }), [])
    const reset = useCallback((update: ShapesUpdate) => dispatch({ type: 'reset', update }), [])
    const undo = useCallback(() => dispatch({ type: 'undo' }), [])
    const redo = useCallback(() => dispatch({ type: 'redo' }), [])

    return {
        shapes: state.present,
        edit,
        reset,
        undo,
        redo,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0
    }
}
