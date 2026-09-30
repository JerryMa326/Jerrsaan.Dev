import { describe, it, expect } from 'vitest'
import type { Shape } from '@/types'
import {
    shapeHistoryReducer,
    initialShapeHistory,
    getUndoShortcut,
    type ShapeHistory,
    type ShapeHistoryAction
} from '@/hooks/useUndoRedo'

function shape(id: string): Shape {
    return { id, label: id, type: 'circle', x: 0, y: 0, radius: 5, color: [0, 0, 0], imageIndex: 0 }
}

function run(actions: ShapeHistoryAction[], start: ShapeHistory = initialShapeHistory): ShapeHistory {
    return actions.reduce(shapeHistoryReducer, start)
}

const add = (id: string): ShapeHistoryAction => ({ type: 'edit', update: prev => [...prev, shape(id)] })
const ids = (h: ShapeHistory) => h.present.map(s => s.id)

// ─── shapeHistoryReducer ────────────────────────────────────────────────────────

describe('shapeHistoryReducer', () => {
    it('undoes and redoes one edit at a time', () => {
        let h = run([add('A'), add('B')])
        expect(ids(h)).toEqual(['A', 'B'])
        h = run([{ type: 'undo' }], h)
        expect(ids(h)).toEqual(['A'])
        h = run([{ type: 'redo' }], h)
        expect(ids(h)).toEqual(['A', 'B'])
    })

    it('keeps the next edit after an undo as its own step', () => {
        // add A, add B, undo, add C: undo must go back to [A], and B must not come back
        let h = run([add('A'), add('B'), { type: 'undo' }, add('C')])
        expect(ids(h)).toEqual(['A', 'C'])
        expect(h.future).toEqual([])
        h = run([{ type: 'undo' }], h)
        expect(ids(h)).toEqual(['A'])
        h = run([{ type: 'redo' }], h)
        expect(ids(h)).toEqual(['A', 'C'])
    })

    it('does nothing when there is nothing to undo or redo', () => {
        const h = run([{ type: 'undo' }, { type: 'redo' }])
        expect(h).toBe(initialShapeHistory)
    })

    it('does not record an edit that changes nothing', () => {
        const h = run([add('A'), { type: 'edit', update: prev => prev }])
        expect(h.past).toHaveLength(1)
    })

    it('reset replaces the shapes and clears history', () => {
        const h = run([add('A'), add('B'), { type: 'undo' }, { type: 'reset', update: prev => prev.slice(1) }])
        expect(ids(h)).toEqual([])
        expect(h.past).toEqual([])
        expect(h.future).toEqual([])
    })

    it('caps history at 50 steps', () => {
        const actions = Array.from({ length: 60 }, (_, i) => add(String(i)))
        expect(run(actions).past).toHaveLength(50)
    })
})

// ─── getUndoShortcut ────────────────────────────────────────────────────────────

describe('getUndoShortcut', () => {
    const key = (k: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {}, target: object | null = null) => ({
        key: k,
        metaKey: !!mods.meta,
        ctrlKey: !!mods.ctrl,
        shiftKey: !!mods.shift,
        target: target as EventTarget | null
    })

    it('maps Cmd/Ctrl+Z to undo', () => {
        expect(getUndoShortcut(key('z', { meta: true }))).toBe('undo')
        expect(getUndoShortcut(key('z', { ctrl: true }))).toBe('undo')
    })

    it('maps Ctrl+Shift+Z to redo when the key reports uppercase Z', () => {
        expect(getUndoShortcut(key('Z', { ctrl: true, shift: true }))).toBe('redo')
        expect(getUndoShortcut(key('z', { meta: true, shift: true }))).toBe('redo')
    })

    it('ignores plain Z and other keys', () => {
        expect(getUndoShortcut(key('z'))).toBeNull()
        expect(getUndoShortcut(key('y', { ctrl: true }))).toBeNull()
    })

    it('leaves text undo to text fields', () => {
        expect(getUndoShortcut(key('z', { ctrl: true }, { tagName: 'INPUT' }))).toBeNull()
        expect(getUndoShortcut(key('z', { ctrl: true }, { tagName: 'TEXTAREA' }))).toBeNull()
        expect(getUndoShortcut(key('z', { ctrl: true }, { tagName: 'SELECT' }))).toBeNull()
        expect(getUndoShortcut(key('z', { ctrl: true }, { tagName: 'DIV', isContentEditable: true }))).toBeNull()
        expect(getUndoShortcut(key('z', { ctrl: true }, { tagName: 'BUTTON' }))).toBe('undo')
    })
})
