import { v4 as uuid } from 'uuid'
import type { Shape, WellPlateSize, WellPlateTemplate, PlateOverlayState } from '@/types'

export const PLATE_CONFIGS: Record<WellPlateSize, { rows: number; cols: number }> = {
    5: { rows: 1, cols: 5 },
    6: { rows: 2, cols: 3 },
    12: { rows: 3, cols: 4 },
    24: { rows: 4, cols: 6 },
    48: { rows: 6, cols: 8 },
    96: { rows: 8, cols: 12 },
}

export function getPlateTemplate(size: WellPlateSize): WellPlateTemplate {
    const cfg = PLATE_CONFIGS[size]
    return { size, rows: cfg.rows, cols: cfg.cols }
}

export function generateWellLabels(rows: number, cols: number): string[] {
    const labels: string[] = []
    for (let r = 0; r < rows; r++) {
        const rowLetter = String.fromCharCode(65 + r) // A, B, C, ...
        for (let c = 0; c < cols; c++) {
            labels.push(`${rowLetter}${c + 1}`)
        }
    }
    return labels
}

export function generatePlateShapes(
    overlay: PlateOverlayState,
    imageIndex: number,
    image: HTMLImageElement,
    restrictedArea: number
): Shape[] {
    const { template, x, y, width, height, rotation, wellRadiusFactor } = overlay
    const cellW = width / template.cols
    const cellH = height / template.rows
    const radius = Math.min(cellW, cellH) * (wellRadiusFactor ?? 0.38)
    const labels = generateWellLabels(template.rows, template.cols)

    // Rotation math
    const centerX = x + width / 2
    const centerY = y + height / 2
    const rad = (rotation ?? 0) * Math.PI / 180
    const cosA = Math.cos(rad)
    const sinA = Math.sin(rad)

    // Create a temporary canvas to extract colors
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return []
    ctx.drawImage(image, 0, 0)

    const shapes: Shape[] = []
    for (let r = 0; r < template.rows; r++) {
        for (let c = 0; c < template.cols; c++) {
            // Unrotated position relative to plate center
            const localX = x + cellW * (c + 0.5) - centerX
            const localY = y + cellH * (r + 0.5) - centerY
            // Apply rotation
            const cx = centerX + localX * cosA - localY * sinA
            const cy = centerY + localX * sinA + localY * cosA
            const idx = r * template.cols + c

            const color = extractCircleColor(ctx, cx, cy, radius, restrictedArea)

            shapes.push({
                id: uuid(),
                label: labels[idx],
                type: 'circle',
                x: cx,
                y: cy,
                radius,
                color,
                imageIndex,
                auto: true,
            })
        }
    }
    return shapes
}

function extractCircleColor(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number, restrictedArea: number
): [number, number, number] {
    const sampleR = radius * (restrictedArea / 100)
    const x0 = Math.max(0, Math.floor(cx - sampleR))
    const y0 = Math.max(0, Math.floor(cy - sampleR))
    const x1 = Math.min(ctx.canvas.width, Math.ceil(cx + sampleR))
    const y1 = Math.min(ctx.canvas.height, Math.ceil(cy + sampleR))
    const w = x1 - x0
    const h = y1 - y0
    if (w <= 0 || h <= 0) return [0, 0, 0]

    const imageData = ctx.getImageData(x0, y0, w, h)
    const data = imageData.data
    let rSum = 0, gSum = 0, bSum = 0, count = 0
    const r2 = sampleR * sampleR

    for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
            const dx = (x0 + px) - cx
            const dy = (y0 + py) - cy
            if (dx * dx + dy * dy <= r2) {
                const i = (py * w + px) * 4
                rSum += data[i]
                gSum += data[i + 1]
                bSum += data[i + 2]
                count++
            }
        }
    }

    if (count === 0) return [0, 0, 0]
    return [
        Math.round(rSum / count),
        Math.round(gSum / count),
        Math.round(bSum / count),
    ]
}

interface CsvField {
    value: string
    quoted: boolean
}

/**
 * Split delimited text into rows of fields.
 * Handles "quoted" fields (which may contain the delimiter or newlines), "" escapes,
 * and CRLF / LF / CR line endings.
 */
function splitDelimited(text: string, delimiter: string): CsvField[][] {
    const rows: CsvField[][] = []
    let row: CsvField[] = []
    let value = ''
    let quoted = false
    let inQuotes = false

    const endField = () => {
        row.push({ value, quoted })
        value = ''
        quoted = false
    }
    const endRow = () => {
        endField()
        rows.push(row)
        row = []
    }

    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (inQuotes) {
            if (ch !== '"') {
                value += ch
            } else if (text[i + 1] === '"') {
                value += '"'
                i++
            } else {
                inQuotes = false
            }
        } else if (ch === delimiter) {
            endField()
        } else if (ch === '\r' || ch === '\n') {
            if (ch === '\r' && text[i + 1] === '\n') i++
            endRow()
        } else if (ch === '"' && !quoted && value.trim() === '') {
            // Opening quote (leading whitespace before it is dropped)
            value = ''
            quoted = true
            inQuotes = true
        } else if (!quoted) {
            // Characters after a closing quote are ignored
            value += ch
        }
    }
    if (value !== '' || quoted || row.length > 0) endRow()

    return rows
}

/** Pick tab or comma, based on whether the first line has a tab in it */
function detectDelimiter(text: string): string {
    const firstLine = text.split(/\r?\n/).find(l => l.trim() !== '') ?? ''
    return firstLine.includes('\t') ? '\t' : ','
}

function cleanField(field: CsvField): string {
    const trimmed = field.value.trim()
    return field.quoted ? trimmed : trimmed.replace(/^'|'$/g, '')
}

/** Parse a whole-field number, optionally followed by a unit ("0.5 mM") */
function parseNumber(raw: string): number | null {
    // Drop a trailing unit such as "mM", "µg/mL" or "%"
    const s = raw.replace(/\s*[a-zµμ%][a-zµμ%/ ]*$/i, '')
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null
    const n = Number(s)
    return Number.isFinite(n) ? n : null
}

export function parseConcentrationCSV(text: string): { label: string; concentration: number }[] {
    // Strip BOM
    const cleaned = text.replace(/^\uFEFF/, '')
    if (!cleaned.trim()) return []

    const delimiter = detectDelimiter(cleaned)
    const results: { label: string; concentration: number }[] = []

    for (const row of splitDelimited(cleaned, delimiter)) {
        if (row.length < 2) continue

        const label = cleanField(row[0])
        const value = parseNumber(cleanField(row[1]))

        // Rows whose value is not a number (headers, notes, blanks) are skipped
        if (value !== null && label) {
            results.push({ label, concentration: value })
        }
    }

    return results
}

export function computeHeatmapColor(value: number, min: number, max: number): [number, number, number] {
    if (max <= min) return [128, 128, 128]

    const t = Math.max(0, Math.min(1, (value - min) / (max - min)))

    // Blue → Cyan → Green → Yellow → Red (5-stop scientific ramp)
    if (t < 0.25) {
        const s = t / 0.25
        return [0, Math.round(255 * s), 255]                         // blue → cyan
    } else if (t < 0.5) {
        const s = (t - 0.25) / 0.25
        return [0, 255, Math.round(255 * (1 - s))]                   // cyan → green
    } else if (t < 0.75) {
        const s = (t - 0.5) / 0.25
        return [Math.round(255 * s), 255, 0]                         // green → yellow
    } else {
        const s = (t - 0.75) / 0.25
        return [255, Math.round(255 * (1 - s)), 0]                   // yellow → red
    }
}
