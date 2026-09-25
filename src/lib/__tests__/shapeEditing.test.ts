import { describe, it, expect } from 'vitest'
import { extractColorStats } from '@/lib/imageUtils'
import { hitTestShape, computeShapeDrag } from '@/hooks/useShapeDrag'
import type { Shape } from '@/types'

// Minimal stand-in for a 2D canvas context: getImageData behaves like the real
// one, returning transparent black for pixels outside the canvas.
function fakeCtx(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]) {
    return {
        canvas: { width, height },
        getImageData(sx: number, sy: number, sw: number, sh: number) {
            const data = new Uint8ClampedArray(sw * sh * 4)
            for (let y = 0; y < sh; y++) {
                for (let x = 0; x < sw; x++) {
                    const ax = sx + x, ay = sy + y
                    if (ax < 0 || ay < 0 || ax >= width || ay >= height) continue
                    const [r, g, b] = pixel(ax, ay)
                    const i = (y * sw + x) * 4
                    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
                }
            }
            return { data, width: sw, height: sh }
        }
    } as unknown as CanvasRenderingContext2D
}

const white = () => [255, 255, 255] as [number, number, number]

// ─── extractColorStats ──────────────────────────────────────────────────────────

describe('extractColorStats', () => {
    it('ignores pixels outside the image for a circle at the edge', () => {
        const ctx = fakeCtx(100, 100, white)
        const stats = extractColorStats(ctx, { type: 'circle', x: 2, y: 50, radius: 10 })
        expect(stats.mean).toEqual([255, 255, 255])
        expect(stats.count).toBeGreaterThan(0)
    })

    it('ignores pixels outside the image for a rectangle at the edge', () => {
        const ctx = fakeCtx(100, 100, white)
        const stats = extractColorStats(ctx, { type: 'rectangle', x: 90, y: 90, width: 20, height: 20 })
        expect(stats.mean).toEqual([255, 255, 255])
        expect(stats.count).toBe(100)
    })

    it('reads a rectangle drawn up and to the left (negative size)', () => {
        // Left half red, right half blue; the rectangle covers x 10..30 (red only).
        const ctx = fakeCtx(100, 100, (x) => x < 50 ? [255, 0, 0] : [0, 0, 255])
        const stats = extractColorStats(ctx, { type: 'rectangle', x: 30, y: 30, width: -20, height: -20 })
        expect(stats.mean).toEqual([255, 0, 0])
        expect(stats.count).toBe(400)
    })

    it('centers the circle mask on the shape center even for fractional centers', () => {
        // Only pixels with x >= 50 are white; a circle centered at 50.5 should be about half white.
        const ctx = fakeCtx(200, 200, (x) => x >= 50 ? [255, 255, 255] : [0, 0, 0])
        const stats = extractColorStats(ctx, { type: 'circle', x: 50.5, y: 100.5, radius: 20 })
        expect(stats.mean[0]).toBeGreaterThan(115)
        expect(stats.mean[0]).toBeLessThan(140)
    })

    it('samples only the inner fraction of a circle when asked', () => {
        // Dark rim, white core: pixels farther than 7px from (50,50) are black.
        const ctx = fakeCtx(100, 100, (x, y) => ((x - 50) ** 2 + (y - 50) ** 2 <= 49 ? [255, 255, 255] : [0, 0, 0]))
        const full = extractColorStats(ctx, { type: 'circle', x: 50, y: 50, radius: 10 })
        const inner = extractColorStats(ctx, { type: 'circle', x: 50, y: 50, radius: 10 }, 0.7)
        expect(full.mean[0]).toBeLessThan(200)
        expect(inner.mean).toEqual([255, 255, 255])
    })

    it('samples only the centered inner fraction of a rectangle when asked', () => {
        // White only inside x,y in [15, 25); rectangle 10..30, fraction 0.5 -> 15..25.
        const ctx = fakeCtx(100, 100, (x, y) => (x >= 15 && x < 25 && y >= 15 && y < 25 ? [255, 255, 255] : [0, 0, 0]))
        const inner = extractColorStats(ctx, { type: 'rectangle', x: 10, y: 10, width: 20, height: 20 }, 0.5)
        expect(inner.mean).toEqual([255, 255, 255])
        expect(inner.count).toBe(100)
    })

    it('defaults to sampling the whole shape', () => {
        const ctx = fakeCtx(100, 100, (x) => x < 20 ? [0, 0, 0] : [255, 255, 255])
        const stats = extractColorStats(ctx, { type: 'rectangle', x: 10, y: 10, width: 20, height: 20 })
        expect(stats.count).toBe(400)
        expect(stats.mean[0]).toBe(128)
    })

    it('returns zero count for a shape entirely outside the image', () => {
        const ctx = fakeCtx(100, 100, white)
        const stats = extractColorStats(ctx, { type: 'circle', x: -50, y: -50, radius: 10 })
        expect(stats.count).toBe(0)
    })
})

// ─── hitTestShape ───────────────────────────────────────────────────────────────

const circle = (radius: number): Shape => ({
    id: 'c', label: 'a', type: 'circle', x: 100, y: 100, radius, color: [0, 0, 0], imageIndex: 0
})
const rect = (x: number, y: number, width: number, height: number): Shape => ({
    id: 'r', label: 'b', type: 'rectangle', x, y, width, height, color: [0, 0, 0], imageIndex: 0
})

describe('hitTestShape', () => {
    it('treats a point near the center of a small circle as the body', () => {
        expect(hitTestShape({ x: 103, y: 100 }, circle(8), 1)).toBe('body')
    })

    it('still finds the edge of a large circle', () => {
        expect(hitTestShape({ x: 148, y: 100 }, circle(50), 1)).toBe('edge')
        expect(hitTestShape({ x: 120, y: 100 }, circle(50), 1)).toBe('body')
    })

    it('lets the body of a small rectangle be grabbed', () => {
        expect(hitTestShape({ x: 110, y: 110 }, rect(100, 100, 20, 20), 1)).toBe('body')
    })

    it('still finds the corners of a large rectangle', () => {
        expect(hitTestShape({ x: 102, y: 102 }, rect(100, 100, 200, 200), 1)).toBe('corner-tl')
        expect(hitTestShape({ x: 298, y: 298 }, rect(100, 100, 200, 200), 1)).toBe('corner-br')
    })

    it('hits a rectangle stored with negative size', () => {
        expect(hitTestShape({ x: 150, y: 150 }, rect(200, 200, -100, -100), 1)).toBe('body')
    })
})

// ─── computeShapeDrag ───────────────────────────────────────────────────────────

describe('computeShapeDrag', () => {
    it('moves the body by the pointer delta', () => {
        expect(computeShapeDrag('body', { x: 10, y: 20, radius: 5 }, { x: 0, y: 0 }, { x: 3, y: -4 }))
            .toEqual({ x: 13, y: 16 })
    })

    it('resizes a circle relative to where the edge was grabbed, without a jump', () => {
        const start = { x: 100, y: 100, radius: 20 }
        // Grabbed 4px inside the rim; moving 1px outward grows the radius by 1px.
        expect(computeShapeDrag('edge', start, { x: 116, y: 100 }, { x: 117, y: 100 })).toEqual({ radius: 21 })
    })

    it('never shrinks a circle below radius 5', () => {
        expect(computeShapeDrag('edge', { x: 100, y: 100, radius: 20 }, { x: 120, y: 100 }, { x: 100, y: 100 }))
            .toEqual({ radius: 5 })
    })

    it('resizes a rectangle from a corner', () => {
        expect(computeShapeDrag('corner-br', { x: 0, y: 0, width: 50, height: 40 }, { x: 50, y: 40 }, { x: 60, y: 45 }))
            .toEqual({ x: 0, y: 0, width: 60, height: 45 })
    })

    it('keeps the opposite corner fixed when a corner is dragged past it', () => {
        expect(computeShapeDrag('corner-tl', { x: 0, y: 0, width: 50, height: 40 }, { x: 0, y: 0 }, { x: 100, y: 100 }))
            .toEqual({ x: 40, y: 30, width: 10, height: 10 })
    })
})
