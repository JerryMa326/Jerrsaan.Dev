import { describe, it, expect } from 'vitest'
import { applyBoundCommit, clampValueToBounds, normalizeBoundValue, roundToOdd } from '@/lib/sliderBounds'

// ─── roundToOdd ─────────────────────────────────────────────────────────────────

describe('roundToOdd', () => {
    it('leaves an odd integer unchanged', () => {
        expect(roundToOdd(9)).toBe(9)
    })

    it('bumps an even integer up to the next odd value', () => {
        expect(roundToOdd(4)).toBe(5)
    })

    it('rounds a fraction before parity-correcting', () => {
        expect(roundToOdd(4.4)).toBe(5) // rounds to 4, then bumped to 5
        expect(roundToOdd(4.6)).toBe(5) // rounds to 5
    })
})

// ─── normalizeBoundValue ────────────────────────────────────────────────────────

describe('normalizeBoundValue', () => {
    it('defaults to a floor of 0, matching the old hard-coded rule', () => {
        expect(normalizeBoundValue(-50)).toBe(0)
    })

    it('honors a custom (e.g. negative) floor for sliders like Brightness', () => {
        expect(normalizeBoundValue(-50, { floor: -100 })).toBe(-50)
        expect(normalizeBoundValue(-150, { floor: -100 })).toBe(-100)
    })

    it('forces odd-only bounds even when an even value is typed', () => {
        expect(normalizeBoundValue(4, { oddOnly: true })).toBe(5)
        expect(normalizeBoundValue(0, { oddOnly: true })).toBe(1)
    })

    it('rounds fractional bounds on integer sliders so the grid does not shift', () => {
        expect(normalizeBoundValue(10.5, { integer: true })).toBe(11)
    })
})

// ─── applyBoundCommit ───────────────────────────────────────────────────────────

describe('applyBoundCommit', () => {
    it('rejects a min bound that would meet or exceed max (would freeze the slider)', () => {
        expect(applyBoundCommit({ min: 10, max: 100 }, 'min', 150)).toBeNull()
    })

    it('rejects a max bound that would meet or exceed min', () => {
        expect(applyBoundCommit({ min: 10, max: 100 }, 'max', 5)).toBeNull()
    })

    it('applies a valid bound edit', () => {
        expect(applyBoundCommit({ min: -100, max: 100 }, 'min', -80, { floor: -100 }))
            .toEqual({ min: -80, max: 100 })
    })

    it('keeps a Brightness-style negative min editable via a custom floor', () => {
        expect(applyBoundCommit({ min: -100, max: 100 }, 'min', -100, { floor: -100 }))
            .toEqual({ min: -100, max: 100 })
    })

    it('never produces an even Blur Kernel bound', () => {
        expect(applyBoundCommit({ min: 3, max: 15 }, 'min', 4, { oddOnly: true }))
            .toEqual({ min: 5, max: 15 })
    })
})

// ─── clampValueToBounds ─────────────────────────────────────────────────────────

describe('clampValueToBounds', () => {
    it('clamps a value below the new min up into range', () => {
        expect(clampValueToBounds(50, { min: 60, max: 100 })).toBe(60)
    })

    it('clamps a value above the new max down into range', () => {
        expect(clampValueToBounds(150, { min: 0, max: 100 })).toBe(100)
    })

    it('keeps an odd-only value odd after clamping', () => {
        expect(clampValueToBounds(4, { min: 5, max: 15 }, { oddOnly: true })).toBe(5)
    })
})
