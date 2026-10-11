export function extractColorFromShape(
    ctx: CanvasRenderingContext2D,
    shape: { type: 'rectangle' | 'circle', x: number, y: number, width?: number, height?: number, radius?: number }
): [number, number, number] {
    const stats = extractColorStats(ctx, shape)
    return stats.mean
}

export interface ColorStats {
    mean: [number, number, number]
    stdDev: [number, number, number]
    count: number
}

export function extractColorStats(
    ctx: CanvasRenderingContext2D,
    shape: { type: 'rectangle' | 'circle', x: number, y: number, width?: number, height?: number, radius?: number },
    sampleFraction = 1
): ColorStats {
    // Sample region in image coordinates. sampleFraction shrinks it around the
    // center, the same way auto-detected and plate wells are sampled.
    let left: number, top: number, right: number, bottom: number
    let circleR2 = 0

    if (shape.type === 'rectangle') {
        // Normalize rectangles drawn up/left (negative width/height)
        const w = shape.width || 0
        const h = shape.height || 0
        const x0 = Math.min(shape.x, shape.x + w)
        const y0 = Math.min(shape.y, shape.y + h)
        const sw = Math.abs(w) * sampleFraction
        const sh = Math.abs(h) * sampleFraction
        left = Math.floor(x0 + (Math.abs(w) - sw) / 2)
        top = Math.floor(y0 + (Math.abs(h) - sh) / 2)
        right = left + Math.max(1, Math.floor(sw))
        bottom = top + Math.max(1, Math.floor(sh))
    } else {
        const r = Math.abs(shape.radius || 0) * sampleFraction
        circleR2 = r * r
        left = Math.floor(shape.x - r)
        top = Math.floor(shape.y - r)
        right = Math.max(left + 1, Math.ceil(shape.x + r))
        bottom = Math.max(top + 1, Math.ceil(shape.y + r))
    }

    // Clamp to the image so pixels outside it are not averaged in as black
    left = Math.max(0, left)
    top = Math.max(0, top)
    right = Math.min(ctx.canvas.width, right)
    bottom = Math.min(ctx.canvas.height, bottom)
    const width = right - left
    const height = bottom - top
    if (width <= 0 || height <= 0) return { mean: [0, 0, 0], stdDev: [0, 0, 0], count: 0 }

    const data = ctx.getImageData(left, top, width, height).data
    let sr = 0, sg = 0, sb = 0
    let sr2 = 0, sg2 = 0, sb2 = 0
    let count = 0

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            if (shape.type === 'circle') {
                const dx = left + px - shape.x
                const dy = top + py - shape.y
                if (dx * dx + dy * dy > circleR2) continue
            }

            const i = (py * width + px) * 4
            const r = data[i], g = data[i + 1], b = data[i + 2]
            sr += r; sg += g; sb += b
            sr2 += r * r; sg2 += g * g; sb2 += b * b
            count++
        }
    }

    if (count === 0) return { mean: [0, 0, 0], stdDev: [0, 0, 0], count: 0 }

    const mean: [number, number, number] = [
        Math.round(sr / count),
        Math.round(sg / count),
        Math.round(sb / count)
    ]

    const stdDev: [number, number, number] = [
        Math.round(Math.sqrt(Math.max(0, sr2 / count - (sr / count) ** 2))),
        Math.round(Math.sqrt(Math.max(0, sg2 / count - (sg / count) ** 2))),
        Math.round(Math.sqrt(Math.max(0, sb2 / count - (sb / count) ** 2)))
    ]

    return { mean, stdDev, count }
}

export function rgbToCmyk(rgb: [number, number, number]): [number, number, number, number] {
    const r = rgb[0] / 255
    const g = rgb[1] / 255
    const b = rgb[2] / 255

    const k = 1 - Math.max(r, g, b)
    if (k === 1) return [0, 0, 0, 1]

    const c = (1 - r - k) / (1 - k)
    const m = (1 - g - k) / (1 - k)
    const y = (1 - b - k) / (1 - k)

    return [c, m, y, k]
}

export function rgbToHsl(rgb: [number, number, number]): [number, number, number] {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0, s = 0

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        else if (max === g) h = ((b - r) / d + 2) / 6
        else h = ((r - g) / d + 4) / 6
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export function rgbToHsv(rgb: [number, number, number]): [number, number, number] {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const v = max
    const d = max - min
    const s = max === 0 ? 0 : d / max
    let h = 0

    if (max !== min) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        else if (max === g) h = ((b - r) / d + 2) / 6
        else h = ((r - g) / d + 4) / 6
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)]
}
