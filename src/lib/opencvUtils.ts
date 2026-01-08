import type { Shape, DetectionSettings } from '@/types'
import { v4 as uuidv4 } from 'uuid'

declare global {
    interface Window {
        cv: any
    }
}

export function isOpenCVReady(): boolean {
    return typeof window.cv !== 'undefined' && window.cv.Mat !== undefined
}

export async function waitForOpenCV(timeout = 10000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
        if (isOpenCVReady()) return true
        await new Promise(r => setTimeout(r, 100))
    }
    return false
}

export function autoDetectCircles(
    image: HTMLImageElement,
    settings: DetectionSettings,
    imageIndex: number,
    existingLabels: Set<string>
): Shape[] {
    if (!isOpenCVReady()) {
        throw new Error('OpenCV is not loaded')
    }

    const cv = window.cv
    const shapes: Shape[] = []

    // Create canvas from image
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0)

    // Read image into OpenCV
    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    const circles = new cv.Mat()

    try {
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

        // Apply Gaussian blur to reduce noise
        cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2, 2)

        // Detect circles using Hough Transform
        cv.HoughCircles(
            gray,
            circles,
            cv.HOUGH_GRADIENT,
            1, // dp
            Math.min(image.width, image.height) / 8, // minDist between circles
            settings.param1, // Canny edge threshold
            settings.param2, // Accumulator threshold
            settings.minRadius,
            settings.maxRadius
        )

        // Process detected circles
        const labels = 'abcdefghijklmnopqrstuvwxyz'
        let labelIndex = 0

        for (let i = 0; i < circles.cols; i++) {
            const x = circles.data32F[i * 3]
            const y = circles.data32F[i * 3 + 1]
            const radius = circles.data32F[i * 3 + 2]

            // Get next available label
            while (labelIndex < labels.length && existingLabels.has(labels[labelIndex])) {
                labelIndex++
            }
            const label = labelIndex < labels.length ? labels[labelIndex] : `?${i + 1}`
            existingLabels.add(label)
            labelIndex++

            // Extract color from the center region
            const sampleRadius = Math.max(1, Math.floor(radius * settings.restrictedArea / 100))
            const color = extractAverageColor(ctx, x, y, sampleRadius)

            shapes.push({
                id: uuidv4(),
                label,
                type: 'circle',
                x: Math.round(x),
                y: Math.round(y),
                radius: Math.round(radius),
                color,
                imageIndex,
                auto: true
            })
        }
    } finally {
        src.delete()
        gray.delete()
        circles.delete()
    }

    return shapes
}

export function autoDetectRectangles(
    image: HTMLImageElement,
    settings: DetectionSettings,
    imageIndex: number,
    existingLabels: Set<string>
): Shape[] {
    if (!isOpenCVReady()) {
        throw new Error('OpenCV is not loaded')
    }

    const cv = window.cv
    const shapes: Shape[] = []

    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0)

    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    const blurred = new cv.Mat()
    const edges = new cv.Mat()
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()

    try {
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
        cv.Canny(blurred, edges, 50, 150)

        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        const labels = 'abcdefghijklmnopqrstuvwxyz'
        let labelIndex = 0

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i)
            const area = cv.contourArea(contour)

            if (area < settings.minArea || area > settings.maxArea) continue

            const perimeter = cv.arcLength(contour, true)
            const approx = new cv.Mat()
            cv.approxPolyDP(contour, approx, settings.epsilon * perimeter, true)

            // Check if it's a quadrilateral (4 corners)
            if (approx.rows === 4) {
                const rect = cv.boundingRect(approx)

                // Check aspect ratio is roughly square-ish
                const aspectRatio = rect.width / rect.height
                if (aspectRatio > 0.5 && aspectRatio < 2.0) {
                    while (labelIndex < labels.length && existingLabels.has(labels[labelIndex])) {
                        labelIndex++
                    }
                    const label = labelIndex < labels.length ? labels[labelIndex] : `?${i + 1}`
                    existingLabels.add(label)
                    labelIndex++

                    const color = extractAverageColorRect(ctx, rect.x, rect.y, rect.width, rect.height, settings.restrictedArea)

                    shapes.push({
                        id: uuidv4(),
                        label,
                        type: 'rectangle',
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                        color,
                        imageIndex,
                        auto: true
                    })
                }
            }
            approx.delete()
        }
    } finally {
        src.delete()
        gray.delete()
        blurred.delete()
        edges.delete()
        contours.delete()
        hierarchy.delete()
    }

    return shapes
}

function extractAverageColor(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
): [number, number, number] {
    const x = Math.max(0, Math.floor(centerX - radius))
    const y = Math.max(0, Math.floor(centerY - radius))
    const size = Math.floor(radius * 2)

    if (size <= 0) return [0, 0, 0]

    const imageData = ctx.getImageData(x, y, size, size)
    const data = imageData.data

    let r = 0, g = 0, b = 0, count = 0

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            const dx = px - radius
            const dy = py - radius
            if (dx * dx + dy * dy <= radius * radius) {
                const i = (py * size + px) * 4
                r += data[i]
                g += data[i + 1]
                b += data[i + 2]
                count++
            }
        }
    }

    if (count === 0) return [0, 0, 0]
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}

function extractAverageColorRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    restrictedArea: number
): [number, number, number] {
    // Sample from the center portion
    const margin = (100 - restrictedArea) / 200
    const sampleX = Math.floor(x + width * margin)
    const sampleY = Math.floor(y + height * margin)
    const sampleW = Math.floor(width * (1 - 2 * margin))
    const sampleH = Math.floor(height * (1 - 2 * margin))

    if (sampleW <= 0 || sampleH <= 0) return [0, 0, 0]

    const imageData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH)
    const data = imageData.data

    let r = 0, g = 0, b = 0
    const total = sampleW * sampleH

    for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
    }

    return [Math.round(r / total), Math.round(g / total), Math.round(b / total)]
}
