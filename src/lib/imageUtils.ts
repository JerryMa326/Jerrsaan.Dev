export function extractColorFromShape(
    ctx: CanvasRenderingContext2D,
    shape: { type: 'rectangle' | 'circle', x: number, y: number, width?: number, height?: number, radius?: number }
): [number, number, number] {
    let imageData: ImageData

    if (shape.type === 'rectangle') {
        const w = Math.max(1, Math.floor(shape.width || 0))
        const h = Math.max(1, Math.floor(shape.height || 0))
        imageData = ctx.getImageData(Math.floor(shape.x), Math.floor(shape.y), w, h)
    } else {
        // For circle, we get the bounding box but we should ideally mask it.
        // For simplicity/performance, we'll just take the square area for now and maybe filter pixels?
        // Or just take the center pixel? No, average is better.
        // Let's take the bounding square.
        const r = shape.radius || 0
        const size = Math.max(1, Math.floor(r * 2))
        imageData = ctx.getImageData(Math.floor(shape.x - r), Math.floor(shape.y - r), size, size)
    }

    const data = imageData.data
    let r = 0, g = 0, b = 0, count = 0

    for (let i = 0; i < data.length; i += 4) {
        // If circle, check distance from center
        if (shape.type === 'circle') {
            const px = (i / 4) % imageData.width
            const py = Math.floor((i / 4) / imageData.width)
            const cx = imageData.width / 2
            const cy = imageData.height / 2
            if ((px - cx) ** 2 + (py - cy) ** 2 > (shape.radius!) ** 2) {
                continue
            }
        }

        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        count++
    }

    if (count === 0) return [0, 0, 0]
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
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
