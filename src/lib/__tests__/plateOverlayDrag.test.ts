import { describe, it, expect } from 'vitest'
import { resizePlateFromCorner, MIN_PLATE_SIZE, type PlateCorner, type PlateRect } from '@/lib/plateOverlayDrag'

// World position of a plate corner, taking rotation around the center into account
function cornerWorld(r: PlateRect, corner: PlateCorner) {
    const rad = ((r.rotation ?? 0) * Math.PI) / 180
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2
    const lx = (corner === 'tl' || corner === 'bl' ? -1 : 1) * r.width / 2
    const ly = (corner === 'tl' || corner === 'tr' ? -1 : 1) * r.height / 2
    return { x: cx + lx * Math.cos(rad) - ly * Math.sin(rad), y: cy + lx * Math.sin(rad) + ly * Math.cos(rad) }
}

const opposite: Record<PlateCorner, PlateCorner> = { tl: 'br', tr: 'bl', bl: 'tr', br: 'tl' }

describe('resizePlateFromCorner', () => {
    it('matches the plain corner math on an unrotated plate', () => {
        const start = { x: 100, y: 50, width: 300, height: 200, rotation: 0 }
        expect(resizePlateFromCorner(start, 'br', 20, 10)).toEqual({ x: 100, y: 50, width: 320, height: 210 })
        const tl = resizePlateFromCorner(start, 'tl', 20, 10)
        expect(tl.x).toBeCloseTo(120); expect(tl.y).toBeCloseTo(60)
        expect(tl.width).toBeCloseTo(280); expect(tl.height).toBeCloseTo(190)
    })

    it('never produces a negative or tiny size when a corner is dragged past the opposite one', () => {
        const start = { x: 100, y: 100, width: 300, height: 200, rotation: 0 }
        for (const corner of ['tl', 'tr', 'bl', 'br'] as PlateCorner[]) {
            const r = resizePlateFromCorner(start, corner, corner.includes('l') ? 1000 : -1000, corner.includes('t') ? 1000 : -1000)
            expect(r.width).toBe(MIN_PLATE_SIZE)
            expect(r.height).toBe(MIN_PLATE_SIZE)
            const a = cornerWorld(start, opposite[corner]), b = cornerWorld({ ...r, rotation: 0 }, opposite[corner])
            expect(b.x).toBeCloseTo(a.x); expect(b.y).toBeCloseTo(a.y)
        }
    })

    for (const rotation of [0, 45, 90, -30]) {
        for (const corner of ['tl', 'tr', 'bl', 'br'] as PlateCorner[]) {
            it(`at ${rotation} deg the ${corner} handle follows the pointer and the opposite corner stays put`, () => {
                const start = { x: 200, y: 150, width: 300, height: 200, rotation }
                const grabbed = cornerWorld(start, corner)
                const dx = 23, dy = -17
                const r = { ...resizePlateFromCorner(start, corner, dx, dy), rotation }

                const handle = cornerWorld(r, corner)
                expect(handle.x).toBeCloseTo(grabbed.x + dx, 6)
                expect(handle.y).toBeCloseTo(grabbed.y + dy, 6)

                const a = cornerWorld(start, opposite[corner]), b = cornerWorld(r, opposite[corner])
                expect(b.x).toBeCloseTo(a.x, 6)
                expect(b.y).toBeCloseTo(a.y, 6)
            })
        }
    }
})
