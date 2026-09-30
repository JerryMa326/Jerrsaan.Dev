import { describe, it, expect } from 'vitest'
import { applyViewTransform, screenToImage, type ViewTransform } from '@/lib/viewTransform'

// Records the canvas transform calls into an affine matrix [a b c d e f]
// (same convention as DOMMatrix), so we can map image points to the screen
// exactly the way the viewer's draw() does.
function recordingCtx() {
    let m = [1, 0, 0, 1, 0, 0]
    const mul = (n: number[]) => {
        const [a, b, c, d, e, f] = m
        m = [
            a * n[0] + c * n[1], b * n[0] + d * n[1],
            a * n[2] + c * n[3], b * n[2] + d * n[3],
            a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f
        ]
    }
    const ctx = {
        translate: (x: number, y: number) => mul([1, 0, 0, 1, x, y]),
        rotate: (r: number) => mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
        scale: (sx: number, sy: number) => mul([sx, 0, 0, sy, 0, 0]),
    } as unknown as CanvasRenderingContext2D
    const toScreen = (p: { x: number; y: number }) => ({
        x: m[0] * p.x + m[2] * p.y + m[4],
        y: m[1] * p.x + m[3] * p.y + m[5]
    })
    return { ctx, toScreen }
}

const base: Omit<ViewTransform, 'zoom' | 'rotation' | 'offset'> = {
    canvasWidth: 800, canvasHeight: 600, imageWidth: 4000, imageHeight: 3000
}

describe('view transform', () => {
    const cases: [number, number, { x: number; y: number }][] = [
        [1, 0, { x: 0, y: 0 }],
        [0.25, 0, { x: 120, y: -40 }],
        [2, 90, { x: -300, y: 55 }],
        [0.5, 45, { x: 17, y: 230 }],
        [3.3, -30, { x: 0, y: 0 }],
        [0.1, 180, { x: -12, y: -99 }],
    ]

    for (const [zoom, rotation, offset] of cases) {
        it(`maps a click back to the drawn image pixel (zoom ${zoom}, ${rotation} deg, offset ${offset.x},${offset.y})`, () => {
            const t: ViewTransform = { ...base, zoom, rotation, offset }
            const { ctx, toScreen } = recordingCtx()
            applyViewTransform(ctx, t)
            for (const p of [{ x: 0, y: 0 }, { x: 1234, y: 567 }, { x: 4000, y: 3000 }]) {
                const back = screenToImage(toScreen(p), t)
                expect(back.x).toBeCloseTo(p.x, 6)
                expect(back.y).toBeCloseTo(p.y, 6)
            }
        })
    }

    it('moves the photo in screen space when panning a rotated view', () => {
        // Panning 100px to the right must move every image pixel 100px to the right on screen.
        const t0: ViewTransform = { ...base, zoom: 0.5, rotation: 90, offset: { x: 0, y: 0 } }
        const t1: ViewTransform = { ...t0, offset: { x: 100, y: 0 } }
        const a = recordingCtx(), b = recordingCtx()
        applyViewTransform(a.ctx, t0)
        applyViewTransform(b.ctx, t1)
        const p = { x: 1000, y: 700 }
        const s0 = a.toScreen(p), s1 = b.toScreen(p)
        expect(s1.x - s0.x).toBeCloseTo(100, 6)
        expect(s1.y - s0.y).toBeCloseTo(0, 6)
    })
})
