// Corner-handle resize of the (possibly rotated) well plate template overlay.

export type PlateCorner = 'tl' | 'tr' | 'bl' | 'br'

export interface PlateRect {
    x: number
    y: number
    width: number
    height: number
    rotation?: number // degrees, around the rectangle center
}

export const MIN_PLATE_SIZE = 10

/**
 * Resize a plate overlay by dragging one corner. `dx`/`dy` is the pointer
 * movement since the drag started, in image coordinates. The delta is turned
 * into the plate's own (rotated) axes, the size never drops below
 * MIN_PLATE_SIZE, and the opposite corner stays fixed in the image.
 */
export function resizePlateFromCorner(
    start: PlateRect,
    corner: PlateCorner,
    dx: number,
    dy: number
): { x: number; y: number; width: number; height: number } {
    const rad = ((start.rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    // Pointer delta in plate-local axes
    const ldx = dx * cos + dy * sin
    const ldy = -dx * sin + dy * cos

    // Direction of the dragged corner from the center (-1 left/top, +1 right/bottom)
    const sx = corner === 'tl' || corner === 'bl' ? -1 : 1
    const sy = corner === 'tl' || corner === 'tr' ? -1 : 1

    const width = Math.max(MIN_PLATE_SIZE, start.width + sx * ldx)
    const height = Math.max(MIN_PLATE_SIZE, start.height + sy * ldy)

    // Opposite corner in world space stays where it was
    const cx = start.x + start.width / 2
    const cy = start.y + start.height / 2
    const ox = -sx * start.width / 2, oy = -sy * start.height / 2
    const anchorX = cx + ox * cos - oy * sin
    const anchorY = cy + ox * sin + oy * cos

    // New center: step back from the anchor by half the new size, in rotated axes
    const hx = sx * width / 2, hy = sy * height / 2
    const ncx = anchorX + hx * cos - hy * sin
    const ncy = anchorY + hx * sin + hy * cos

    return { x: ncx - width / 2, y: ncy - height / 2, width, height }
}
