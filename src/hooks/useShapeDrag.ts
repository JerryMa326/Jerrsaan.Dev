import type { Shape } from '@/types'

export type HitResult = 'body' | 'edge' | 'corner-tl' | 'corner-tr' | 'corner-bl' | 'corner-br' | null

const CORNER_TOLERANCE = 10
const EDGE_TOLERANCE = 6

export function hitTestShape(
    point: { x: number; y: number },
    shape: Shape,
    zoomLevel: number
): HitResult {
    const tol = CORNER_TOLERANCE / zoomLevel
    const edgeTol = EDGE_TOLERANCE / zoomLevel

    if (shape.type === 'circle') {
        const dx = point.x - shape.x
        const dy = point.y - shape.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const r = shape.radius || 0

        if (Math.abs(dist - r) < edgeTol) return 'edge'
        if (dist < r) return 'body'
        return null
    }

    if (shape.type === 'rectangle') {
        const w = shape.width || 0
        const h = shape.height || 0
        const x1 = shape.x, y1 = shape.y
        const x2 = x1 + w, y2 = y1 + h

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

export function getCursorForHit(hit: HitResult): string {
    switch (hit) {
        case 'body': return 'move'
        case 'edge': return 'nwse-resize'
        case 'corner-tl': case 'corner-br': return 'nwse-resize'
        case 'corner-tr': case 'corner-bl': return 'nesw-resize'
        default: return 'default'
    }
}
