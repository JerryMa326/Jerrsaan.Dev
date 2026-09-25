import { describe, it, expect, vi, afterEach } from 'vitest'
import { generatePlateShapes, getPlateTemplate } from '@/lib/plateUtils'
import type { PlateOverlayState } from '@/types'

const IMG_W = 160
const IMG_H = 120

function makeImage(): Uint8ClampedArray {
    const data = new Uint8ClampedArray(IMG_W * IMG_H * 4)
    for (let y = 0; y < IMG_H; y++) {
        for (let x = 0; x < IMG_W; x++) {
            const i = (y * IMG_W + x) * 4
            data[i] = (x * 7 + y * 3) % 256
            data[i + 1] = (x * y) % 256
            data[i + 2] = (255 - x - y * 2 + 512) % 256
            data[i + 3] = 255
        }
    }
    return data
}

// Canvas getImageData semantics: pixels outside the image come back as transparent black
function getImageData(image: Uint8ClampedArray, x0: number, y0: number, w: number, h: number) {
    const data = new Uint8ClampedArray(w * h * 4)
    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const sx = x0 + px, sy = y0 + py
            if (sx < 0 || sy < 0 || sx >= IMG_W || sy >= IMG_H) continue
            const si = (sy * IMG_W + sx) * 4
            const di = (py * w + px) * 4
            data.set(image.subarray(si, si + 4), di)
        }
    }
    return { data, width: w, height: h }
}

// The previous per-well implementation, one getImageData per well
function oldExtractCircleColor(image: Uint8ClampedArray, cx: number, cy: number, radius: number, restrictedArea: number) {
    const sampleR = radius * (restrictedArea / 100)
    const x0 = Math.max(0, Math.floor(cx - sampleR))
    const y0 = Math.max(0, Math.floor(cy - sampleR))
    const x1 = Math.min(IMG_W, Math.ceil(cx + sampleR))
    const y1 = Math.min(IMG_H, Math.ceil(cy + sampleR))
    const w = x1 - x0
    const h = y1 - y0
    if (w <= 0 || h <= 0) return [0, 0, 0]
    const data = getImageData(image, x0, y0, w, h).data
    let rSum = 0, gSum = 0, bSum = 0, count = 0
    const r2 = sampleR * sampleR
    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const dx = (x0 + px) - cx
            const dy = (y0 + py) - cy
            if (dx * dx + dy * dy <= r2) {
                const i = (py * w + px) * 4
                rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]
                count++
            }
        }
    }
    if (count === 0) return [0, 0, 0]
    return [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)]
}

function stubCanvas(image: Uint8ClampedArray) {
    const reads: number[][] = []
    const ctx = {
        drawImage: () => {},
        getImageData: (x: number, y: number, w: number, h: number) => {
            reads.push([x, y, w, h])
            return getImageData(image, x, y, w, h)
        },
    }
    vi.stubGlobal('document', {
        createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
    })
    return reads
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('generatePlateShapes', () => {
    const image = makeImage()
    const htmlImage = { naturalWidth: IMG_W, naturalHeight: IMG_H } as HTMLImageElement

    const overlays: PlateOverlayState[] = [
        // Fully inside the image
        { template: getPlateTemplate(96), x: 10, y: 12, width: 130, height: 90, rotation: 0, wellRadiusFactor: 0.38 },
        // Rotated and hanging off the top-left and right edges
        { template: getPlateTemplate(24), x: -15, y: -10, width: 190, height: 100, rotation: 7, wellRadiusFactor: 0.45 },
        // Entirely outside the image
        { template: getPlateTemplate(6), x: 400, y: 400, width: 60, height: 40, rotation: 0, wellRadiusFactor: 0.38 },
    ]

    it.each(overlays.map((o, i) => [i, o] as const))('matches the per-well colors of the previous implementation (overlay %i)', (_i, overlay) => {
        stubCanvas(image)
        const shapes = generatePlateShapes(overlay, 0, htmlImage, 70)
        expect(shapes).toHaveLength(overlay.template.rows * overlay.template.cols)
        for (const s of shapes) {
            expect(s.color).toEqual(oldExtractCircleColor(image, s.x, s.y, s.radius!, 70))
        }
    })

    it('reads the image once for the whole plate', () => {
        const reads = stubCanvas(image)
        generatePlateShapes(overlays[0], 0, htmlImage, 70)
        expect(reads).toHaveLength(1)
    })
})
