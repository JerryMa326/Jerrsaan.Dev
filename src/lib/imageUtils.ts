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
    shape: { type: 'rectangle' | 'circle', x: number, y: number, width?: number, height?: number, radius?: number }
): ColorStats {
    let imageData: ImageData

    if (shape.type === 'rectangle') {
        const w = Math.max(1, Math.floor(shape.width || 0))
        const h = Math.max(1, Math.floor(shape.height || 0))
        imageData = ctx.getImageData(Math.floor(shape.x), Math.floor(shape.y), w, h)
    } else {
        const r = shape.radius || 0
        const size = Math.max(1, Math.floor(r * 2))
        imageData = ctx.getImageData(Math.floor(shape.x - r), Math.floor(shape.y - r), size, size)
    }

    const data = imageData.data
    let sr = 0, sg = 0, sb = 0
    let sr2 = 0, sg2 = 0, sb2 = 0
    let count = 0

    for (let i = 0; i < data.length; i += 4) {
        if (shape.type === 'circle') {
            const px = (i / 4) % imageData.width
            const py = Math.floor((i / 4) / imageData.width)
            const cx = imageData.width / 2
            const cy = imageData.height / 2
            if ((px - cx) ** 2 + (py - cy) ** 2 > (shape.radius!) ** 2) {
                continue
            }
        }

        const r = data[i], g = data[i + 1], b = data[i + 2]
        sr += r; sg += g; sb += b
        sr2 += r * r; sg2 += g * g; sb2 += b * b
        count++
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
