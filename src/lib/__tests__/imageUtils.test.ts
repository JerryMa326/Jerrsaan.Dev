import { describe, it, expect } from 'vitest'
import { rgbToCmyk, rgbToHsl, rgbToHsv } from '@/lib/imageUtils'

// ─── rgbToCmyk ──────────────────────────────────────────────────────────────────

describe('rgbToCmyk', () => {
    it('converts black [0,0,0] to [0,0,0,1]', () => {
        expect(rgbToCmyk([0, 0, 0])).toEqual([0, 0, 0, 1])
    })

    it('converts white [255,255,255] to [0,0,0,0]', () => {
        expect(rgbToCmyk([255, 255, 255])).toEqual([0, 0, 0, 0])
    })

    it('converts pure red [255,0,0]', () => {
        const [c, m, y, k] = rgbToCmyk([255, 0, 0])
        expect(c).toBeCloseTo(0)
        expect(m).toBeCloseTo(1)
        expect(y).toBeCloseTo(1)
        expect(k).toBeCloseTo(0)
    })

    it('converts pure green [0,255,0]', () => {
        const [c, m, y, k] = rgbToCmyk([0, 255, 0])
        expect(c).toBeCloseTo(1)
        expect(m).toBeCloseTo(0)
        expect(y).toBeCloseTo(1)
        expect(k).toBeCloseTo(0)
    })

    it('converts pure blue [0,0,255]', () => {
        const [c, m, y, k] = rgbToCmyk([0, 0, 255])
        expect(c).toBeCloseTo(1)
        expect(m).toBeCloseTo(1)
        expect(y).toBeCloseTo(0)
        expect(k).toBeCloseTo(0)
    })
})

// ─── rgbToHsl ───────────────────────────────────────────────────────────────────

describe('rgbToHsl', () => {
    it('converts black [0,0,0] to [0,0,0]', () => {
        expect(rgbToHsl([0, 0, 0])).toEqual([0, 0, 0])
    })

    it('converts white [255,255,255] to [0,0,100]', () => {
        expect(rgbToHsl([255, 255, 255])).toEqual([0, 0, 100])
    })

    it('converts pure red [255,0,0] to [0,100,50]', () => {
        expect(rgbToHsl([255, 0, 0])).toEqual([0, 100, 50])
    })

    it('converts pure green [0,255,0] to [120,100,50]', () => {
        expect(rgbToHsl([0, 255, 0])).toEqual([120, 100, 50])
    })

    it('converts pure blue [0,0,255] to [240,100,50]', () => {
        expect(rgbToHsl([0, 0, 255])).toEqual([240, 100, 50])
    })

    it('converts mid-gray [128,128,128]', () => {
        const [h, s, l] = rgbToHsl([128, 128, 128])
        expect(h).toBe(0)
        expect(s).toBe(0)
        expect(l).toBe(50)
    })
})

// ─── rgbToHsv ───────────────────────────────────────────────────────────────────

describe('rgbToHsv', () => {
    it('converts black [0,0,0] to [0,0,0]', () => {
        expect(rgbToHsv([0, 0, 0])).toEqual([0, 0, 0])
    })

    it('converts white [255,255,255] to [0,0,100]', () => {
        expect(rgbToHsv([255, 255, 255])).toEqual([0, 0, 100])
    })

    it('converts pure red [255,0,0] to [0,100,100]', () => {
        expect(rgbToHsv([255, 0, 0])).toEqual([0, 100, 100])
    })

    it('converts pure green [0,255,0] to [120,100,100]', () => {
        expect(rgbToHsv([0, 255, 0])).toEqual([120, 100, 100])
    })

    it('converts pure blue [0,0,255] to [240,100,100]', () => {
        expect(rgbToHsv([0, 0, 255])).toEqual([240, 100, 100])
    })

    it('converts mid-gray [128,128,128]', () => {
        const [h, s, v] = rgbToHsv([128, 128, 128])
        expect(h).toBe(0)
        expect(s).toBe(0)
        expect(v).toBe(50)
    })
})
