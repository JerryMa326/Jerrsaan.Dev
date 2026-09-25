import type { Shape } from '@/types'

export type HitResult = 'body' | 'edge' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null

const CORNER_TOLERANCE = 20
const EDGE_TOLERANCE = 14
// Handle zones never cover more than this fraction of the shape, so the body
// of a small shape stays reachable at any zoom level.
const MAX_HANDLE_FRACTION = 0.3

const MIN_CIRCLE_RADIUS = 5
const MIN_RECT_SIZE = 10

export function hitTestShape(
    point: { x: number; y: number },
    shape: Shape,
    zoomLevel: number
): HitResult {
    if (shape.type === 'circle') {
        const dx = point.x - shape.x
        const dy = point.y - shape.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const r = shape.radius || 0
        const edgeTol = Math.min(EDGE_TOLERANCE / zoomLevel, r * MAX_HANDLE_FRACTION)

        if (Math.abs(dist - r) < edgeTol) return 'edge'
        if (dist < r) return 'body'
        return null
    }

    if (shape.type === 'rectangle') {
        const w = shape.width || 0
        const h = shape.height || 0
        const x1 = Math.min(shape.x, shape.x + w), y1 = Math.min(shape.y, shape.y + h)
        const x2 = Math.max(shape.x, shape.x + w), y2 = Math.max(shape.y, shape.y + h)
        const tol = Math.min(CORNER_TOLERANCE / zoomLevel, Math.min(x2 - x1, y2 - y1) * MAX_HANDLE_FRACTION)

        // Corners
        if (Math.abs(point.x - x1) < tol && Math.abs(point.y - y1) < tol) return 'corner-tl'
        if (Math.abs(point.x - x2) < tol && Math.abs(point.y - y1) < tol) return 'corner-tr'
        if (Math.abs(point.x - x1) < tol && Math.abs(point.y - y2) < tol) return 'corner-bl'
        if (Math.abs(point.x - x2) < tol && Math.abs(point.y - y2) < tol) return 'corner-br'

        // Inside
        if (point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2) return 'body'
        return null
    }

    return null
}

export interface ShapeGeometry {
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
}

/**
 * Geometry of a shape being dragged, given the hit that started the drag, the
 * shape and pointer at drag start, and the current pointer (image coordinates).
 * Rectangles are expected in normalized form (non-negative width/height).
 */
export function computeShapeDrag(
    hit: HitResult,
    start: ShapeGeometry,
    startPt: { x: number; y: number },
    pt: { x: number; y: number }
): Partial<ShapeGeometry> {
    const dx = pt.x - startPt.x
    const dy = pt.y - startPt.y

    if (hit === 'body') {
        return { x: start.x + dx, y: start.y + dy }
    }

    if (hit === 'edge') {
        // Change the radius by how far the pointer moved toward/away from the
        // center, so grabbing slightly inside or outside the rim does not jump.
        const startDist = Math.hypot(startPt.x - start.x, startPt.y - start.y)
        const dist = Math.hypot(pt.x - start.x, pt.y - start.y)
        return { radius: Math.max(MIN_CIRCLE_RADIUS, (start.radius || 0) + dist - startDist) }
    }

    if (hit?.startsWith('corner-')) {
        const w = start.width || 0
        const h = start.height || 0
        const movesLeft = hit === 'corner-tl' || hit === 'corner-bl'
        const movesTop = hit === 'corner-tl' || hit === 'corner-tr'

        // The opposite corner stays anchored; size never drops below the minimum
        const newW = Math.max(MIN_RECT_SIZE, movesLeft ? w - dx : w + dx)
        const newH = Math.max(MIN_RECT_SIZE, movesTop ? h - dy : h + dy)
        return {
            x: movesLeft ? start.x + w - newW : start.x,
            y: movesTop ? start.y + h - newH : start.y,
            width: newW,
            height: newH
        }
    }

    return {}
}

export function getCursorForHit(hit: HitResult): string {
    switch (hit) {
        case 'body': return 'move'
        case 'edge': return 'nwse-resize'
        case 'corner-tl': case 'corner-br': return 'nwse-resize'
        case 'corner-tr': case 'corner-bl': return 'nesw-resize'
        default: return 'default'
    }
}
