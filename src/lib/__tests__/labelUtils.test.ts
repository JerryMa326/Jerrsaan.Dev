import { describe, it, expect } from 'vitest'
import { carryConcentrationOnRename, resolveLabelEdit } from '@/lib/labelUtils'

describe('resolveLabelEdit', () => {
    it('trims surrounding whitespace', () => {
        expect(resolveLabelEdit('  A1  ', 'A1', [])).toBe('A1')
    })

    it('rejects an empty label so the row does not vanish', () => {
        expect(resolveLabelEdit('', 'A1', ['B2'])).toBeNull()
        expect(resolveLabelEdit('   ', 'A1', ['B2'])).toBeNull()
    })

    it('rejects a label that collides with another sample', () => {
        expect(resolveLabelEdit('B2', 'A1', ['B2', 'C3'])).toBeNull()
    })

    it('allows keeping the same label unchanged', () => {
        expect(resolveLabelEdit('A1', 'A1', ['B2'])).toBe('A1')
    })

    it('allows renaming to a label nobody else has', () => {
        expect(resolveLabelEdit('D4', 'A1', ['B2', 'C3'])).toBe('D4')
    })
})

describe('carryConcentrationOnRename', () => {
    it('copies the concentration to the new label and keeps the old entry', () => {
        // Photo 1 and photo 2 both have an A1; renaming photo 2's A1 must not
        // strip photo 1's A1 of its concentration.
        const points = [{ label: 'A1', y: 1 }]
        expect(carryConcentrationOnRename(points, 'A1', 'A1x')).toEqual([
            { label: 'A1', y: 1 },
            { label: 'A1x', y: 1 },
        ])
    })

    it('never creates a second entry for a label that already has one', () => {
        const points = [{ label: 'A1', y: 1 }, { label: 'B2', y: 2 }]
        const next = carryConcentrationOnRename(points, 'B2', 'A1')
        expect(next).toBe(points)
        expect(next.filter(p => p.label === 'A1')).toHaveLength(1)
    })

    it('keeps the link through undo and redo of the rename', () => {
        const before = [{ label: 'A1', y: 1 }]
        const after = carryConcentrationOnRename(before, 'A1', 'X')
        // Undo puts the sample back to A1: A1 still has its concentration.
        expect(after.find(p => p.label === 'A1')?.y).toBe(1)
        // Redo puts it back to X: X still has it too.
        expect(after.find(p => p.label === 'X')?.y).toBe(1)
    })

    it('is a no-op when the old label has no concentration or the label is unchanged', () => {
        const points = [{ label: 'A1', y: 1 }]
        expect(carryConcentrationOnRename(points, 'C3', 'D4')).toBe(points)
        expect(carryConcentrationOnRename(points, 'A1', 'A1')).toBe(points)
    })
})
