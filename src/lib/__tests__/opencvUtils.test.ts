import { describe, it, expect } from 'vitest'
import {
    houghMinDist,
    nextAutoLabel,
    sortReadingOrder,
    extractAverageColor,
    extractAverageColorRect,
    type PixelBuffer,
} from '@/lib/opencvUtils'

function makeBuffer(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): PixelBuffer {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const [r, g, b] = fill(x, y)
            const i = (y * width + x) * 4
            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
            data[i + 3] = 255
        }
    }
    return { data, width, height }
}

// The previous implementation, reading a region with getImageData semantics
// (out-of-range pixels come back as transparent black).
function oldExtractAverageColor(buf: PixelBuffer, centerX: number, centerY: number, radius: number) {
    const x = Math.max(0, Math.floor(centerX - radius))
    const y = Math.max(0, Math.floor(centerY - radius))
    const size = Math.floor(radius * 2)
    if (size <= 0) return [0, 0, 0]
    let r = 0, g = 0, b = 0, count = 0
    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            const dx = px - radius
            const dy = py - radius
            if (dx * dx + dy * dy <= radius * radius) {
                const ax = x + px, ay = y + py
                if (ax < buf.width && ay < buf.height) {
                    const i = (ay * buf.width + ax) * 4
                    r += buf.data[i]; g += buf.data[i + 1]; b += buf.data[i + 2]
                }
                count++
            }
        }
    }
    if (count === 0) return [0, 0, 0]
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}

describe('houghMinDist', () => {
    it('allows 96-well spacing: centers only need to be two minimum radii apart', () => {
        // 96-well plate photographed at ~7.8 px/mm: pitch ~70 px, wells ~27 px radius
        expect(houghMinDist({ minRadius: 25 })).toBe(50)
        expect(houghMinDist({ minRadius: 25 })).toBeLessThan(70)
    })

    it('never returns less than 1', () => {
        expect(houghMinDist({ minRadius: 0 })).toBe(1)
    })
})

describe('nextAutoLabel', () => {
    it('uses a-z first, skipping used letters', () => {
        expect(nextAutoLabel(new Set())).toBe('a')
        expect(nextAutoLabel(new Set(['a', 'b', 'd']))).toBe('c')
    })

    it('falls back to ?N without repeating labels already used on other images', () => {
        const used = new Set('abcdefghijklmnopqrstuvwxyz'.split(''))
        used.add('?1')
        used.add('?2')
        expect(nextAutoLabel(used)).toBe('?3')
    })

    it('produces unique labels across two detection runs sharing one label set', () => {
        const used = new Set<string>()
        const all: string[] = []
        for (let run = 0; run < 2; run++) {
            for (let i = 0; i < 40; i++) {
                const label = nextAutoLabel(used)
                used.add(label)
                all.push(label)
            }
        }
        expect(new Set(all).size).toBe(80)
    })
})

describe('sortReadingOrder', () => {
    it('orders a jittered grid row by row, left to right', () => {
        const grid: { x: number; y: number; id: string }[] = []
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 4; c++) {
                grid.push({ x: 50 + c * 70 + (c % 2) * 3, y: 50 + r * 70 + ((c * 7) % 5) - 2, id: `${r}${c}` })
            }
        }
        const shuffled = [grid[7], grid[0], grid[11], grid[3], grid[5], grid[9], grid[1], grid[10], grid[2], grid[8], grid[4], grid[6]]
        expect(sortReadingOrder(shuffled, 25).map(p => p.id)).toEqual(grid.map(p => p.id))
    })

    it('returns an empty list for no detections', () => {
        expect(sortReadingOrder([], 10)).toEqual([])
    })
})

describe('extractAverageColor', () => {
    const buf = makeBuffer(60, 50, (x, y) => [x * 4, y * 5, (x + y) % 256])

    it('matches the previous result for circles fully inside the image', () => {
        for (const [cx, cy, r] of [[30, 25, 8], [20.6, 17.3, 5], [40.2, 30.9, 7]]) {
            expect(extractAverageColor(buf, cx, cy, r)).toEqual(oldExtractAverageColor(buf, cx, cy, r))
        }
    })

    it('keeps the mask centered on the circle near the top-left edge', () => {
        // Left half dark, right half bright: a circle centered on x=2 must see mostly dark pixels
        const split = makeBuffer(40, 40, x => (x < 4 ? [0, 0, 0] : [200, 200, 200]))
        const [r] = extractAverageColor(split, 2, 20, 3)
        // The box is clamped at x=0; the mask must stay centered on x=2, which is mostly dark
        expect(r).toBeLessThan(100)
        // The old code shifted the mask right and reported a bright color
        expect(oldExtractAverageColor(split, 2, 20, 3)[0]).toBeGreaterThan(r)
    })

    it('ignores pixels past the right and bottom edges instead of counting them as black', () => {
        const white = makeBuffer(20, 20, () => [255, 255, 255])
        expect(extractAverageColor(white, 18, 18, 5)).toEqual([255, 255, 255])
        expect(oldExtractAverageColor(white, 18, 18, 5)[0]).toBeLessThan(255)
    })
})

describe('extractAverageColorRect', () => {
    it('averages the restricted center portion', () => {
        const buf = makeBuffer(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? [100, 150, 200] : [0, 0, 0]))
        expect(extractAverageColorRect(buf, 0, 0, 20, 20, 50)).toEqual([100, 150, 200])
    })
})
