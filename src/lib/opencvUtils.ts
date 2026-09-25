import type { Shape, DetectionSettings } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export function isOpenCVReady(): boolean {
    return window.cv !== undefined && window.cv.Mat !== undefined
}

export async function waitForOpenCV(timeout = 10000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
        if (isOpenCVReady()) return true
        await new Promise(r => setTimeout(r, 100))
    }
    return false
}

/**
 * Apply preprocessing to an image before detection
 * This can dramatically improve detection on images with poor lighting or low contrast
 */
function preprocessImage(mat: OpenCVMat, settings: DetectionSettings): void {
    const cv = window.cv!

    // Apply brightness and contrast adjustment, pivoting contrast around mid-grey
    // so detection sees the same image as the on-screen preview:
    // newPixel = contrast * (oldPixel - 128) + 128 + brightness
    if (settings.brightness !== 0 || settings.contrast !== 1.0) {
        mat.convertTo(mat, -1, settings.contrast, settings.brightness + 128 * (1 - settings.contrast))
    }

    // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    // This is excellent for images with uneven lighting
    if (settings.claheEnabled) {
        const clahe = new cv.CLAHE(settings.claheClipLimit, new cv.Size(8, 8))
        try {
            clahe.apply(mat, mat)
        } finally {
            clahe.delete()
        }
    }

    // Apply sharpening using unsharp mask technique
    if (settings.sharpenEnabled && settings.sharpenAmount > 0) {
        const blurred = new cv.Mat()
        try {
            cv.GaussianBlur(mat, blurred, new cv.Size(0, 0), 3)
            // sharpened = original * (1 + amount) - blurred * amount
            cv.addWeighted(mat, 1.0 + settings.sharpenAmount, blurred, -settings.sharpenAmount, 0, mat)
        } finally {
            blurred.delete()
        }
    }
}

/**
 * Minimum distance between detected circle centers.
 * Wells cannot overlap, so two real wells are at least 2 * minRadius apart.
 */
export function houghMinDist(settings: Pick<DetectionSettings, 'minRadius'>): number {
    return Math.max(1, settings.minRadius * 2)
}

const AUTO_LABELS = 'abcdefghijklmnopqrstuvwxyz'

/** Next free auto label: a-z first, then ?1, ?2, ... skipping any label already in use */
export function nextAutoLabel(usedLabels: Set<string>): string {
    for (const letter of AUTO_LABELS) {
        if (!usedLabels.has(letter)) return letter
    }
    let n = 1
    while (usedLabels.has(`?${n}`)) n++
    return `?${n}`
}

/**
 * Sort detections into reading order: rows top to bottom, then left to right within a row.
 * A detection joins the current row when its y is within rowTolerance of the row's mean y.
 */
export function sortReadingOrder<T extends { x: number; y: number }>(items: T[], rowTolerance: number): T[] {
    const byY = [...items].sort((a, b) => a.y - b.y)
    const rows: T[][] = []
    let rowMeanY = 0
    for (const item of byY) {
        const row = rows[rows.length - 1]
        if (row && item.y - rowMeanY <= rowTolerance) {
            row.push(item)
            rowMeanY += (item.y - rowMeanY) / row.length
        } else {
            rows.push([item])
            rowMeanY = item.y
        }
    }
    return rows.flatMap(row => row.sort((a, b) => a.x - b.x))
}

function median(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
}


export function autoDetectCircles(
    image: HTMLImageElement,
    settings: DetectionSettings,
    imageIndex: number,
    existingLabels: Set<string>,
    boundingBox?: { x: number; y: number; width: number; height: number } | null
): Shape[] {
    if (!isOpenCVReady()) {
        throw new Error('OpenCV is not loaded')
    }

    const cv = window.cv!
    const shapes: Shape[] = []

    // Create canvas from image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    // If boundingBox is defined, only process that region
    let offsetX = 0
    let offsetY = 0
    if (boundingBox) {
        canvas.width = boundingBox.width
        canvas.height = boundingBox.height
        ctx.drawImage(
            image,
            boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
            0, 0, boundingBox.width, boundingBox.height
        )
        offsetX = boundingBox.x
        offsetY = boundingBox.y
    } else {
        canvas.width = image.width
        canvas.height = image.height
        ctx.drawImage(image, 0, 0)
    }

    // Read image into OpenCV
    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    const circles = new cv.Mat()

    try {
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

        // Apply preprocessing (brightness, contrast, CLAHE, sharpening)
        preprocessImage(gray, settings)

        // Apply Gaussian blur to reduce noise (configurable kernel size)
        const kernelSize = settings.blurKernelSize || 9
        cv.GaussianBlur(gray, gray, new cv.Size(kernelSize, kernelSize), 2, 2)

        // Detect circles using Hough Transform
        cv.HoughCircles(
            gray,
            circles,
            cv.HOUGH_GRADIENT,
            1, // dp
            houghMinDist(settings), // minDist between circles
            settings.param1, // Canny edge threshold
            settings.param2, // Accumulator threshold
            settings.minRadius,
            settings.maxRadius
        )

        // Collect detected circles (local coordinates on the cropped canvas)
        const found: { x: number; y: number; radius: number }[] = []
        for (let i = 0; i < circles.cols; i++) {
            found.push({
                x: circles.data32F[i * 3],
                y: circles.data32F[i * 3 + 1],
                radius: circles.data32F[i * 3 + 2]
            })
        }

        // Label in reading order so neighboring wells get consecutive labels
        const ordered = sortReadingOrder(found, median(found.map(c => c.radius)))
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)

        for (const { x: localX, y: localY, radius } of ordered) {
            // Convert local coordinates back to image coordinates
            const x = localX + offsetX
            const y = localY + offsetY

            const label = nextAutoLabel(existingLabels)
            existingLabels.add(label)

            // Extract color from the center region (use local coordinates for the cropped canvas)
            const sampleRadius = Math.max(1, Math.floor(radius * settings.restrictedArea / 100))
            const color = extractAverageColor(pixels, localX, localY, sampleRadius)

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
    existingLabels: Set<string>,
    boundingBox?: { x: number; y: number; width: number; height: number } | null
): Shape[] {
    if (!isOpenCVReady()) {
        throw new Error('OpenCV is not loaded')
    }

    const cv = window.cv!
    const shapes: Shape[] = []

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    // If boundingBox is defined, only process that region
    let offsetX = 0
    let offsetY = 0
    if (boundingBox) {
        canvas.width = boundingBox.width
        canvas.height = boundingBox.height
        ctx.drawImage(
            image,
            boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
            0, 0, boundingBox.width, boundingBox.height
        )
        offsetX = boundingBox.x
        offsetY = boundingBox.y
    } else {
        canvas.width = image.width
        canvas.height = image.height
        ctx.drawImage(image, 0, 0)
    }

    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    const blurred = new cv.Mat()
    const edges = new cv.Mat()
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()

    try {
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

        // Apply preprocessing (brightness, contrast, CLAHE, sharpening)
        preprocessImage(gray, settings)

        const kernelSize = Math.min(settings.blurKernelSize || 5, 7) // smaller blur for edge detection
        cv.GaussianBlur(gray, blurred, new cv.Size(kernelSize, kernelSize), 0)
        cv.Canny(blurred, edges, 50, 150)

        cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        const found: OpenCVRect[] = []
        for (let i = 0; i < contours.size(); i++) {
            // contours.get() returns a new Mat that must be freed
            const contour = contours.get(i)
            let approx: OpenCVMat | null = null
            try {
                const area = cv.contourArea(contour)
                if (area < settings.minArea || area > settings.maxArea) continue

                const perimeter = cv.arcLength(contour, true)
                approx = new cv.Mat()
                cv.approxPolyDP(contour, approx, settings.epsilon * perimeter, true)

                // Check if it's a quadrilateral (4 corners)
                if (approx.rows !== 4) continue
                const rect = cv.boundingRect(approx)

                // Check aspect ratio is roughly square-ish
                const aspectRatio = rect.width / rect.height
                if (aspectRatio > 0.5 && aspectRatio < 2.0) {
                    found.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
                }
            } finally {
                approx?.delete()
                contour.delete()
            }
        }

        // Label in reading order (by rectangle center) so neighboring wells get consecutive labels
        const centers = found.map(rect => ({ rect, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }))
        const ordered = sortReadingOrder(centers, median(found.map(r => Math.min(r.width, r.height) / 2)))
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)

        for (const { rect } of ordered) {
            const label = nextAutoLabel(existingLabels)
            existingLabels.add(label)

            // Use local coordinates for color extraction from cropped canvas
            const color = extractAverageColorRect(pixels, rect.x, rect.y, rect.width, rect.height, settings.restrictedArea)

            shapes.push({
                id: uuidv4(),
                label,
                type: 'rectangle',
                // Convert local coordinates to image coordinates
                x: rect.x + offsetX,
                y: rect.y + offsetY,
                width: rect.width,
                height: rect.height,
                color,
                imageIndex,
                auto: true
            })
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

/** RGBA pixel buffer, e.g. an ImageData read once per detection run */
export interface PixelBuffer {
    data: Uint8ClampedArray
    width: number
    height: number
}

/**
 * Average color inside a circle of the given radius.
 * The sample box starts at floor(center - radius); pixels outside the buffer are skipped.
 */
export function extractAverageColor(
    pixels: PixelBuffer,
    centerX: number,
    centerY: number,
    radius: number
): [number, number, number] {
    const x0 = Math.floor(centerX - radius)
    const y0 = Math.floor(centerY - radius)
    const size = Math.floor(radius * 2)

    if (size <= 0) return [0, 0, 0]

    const { data, width, height } = pixels
    // Mask center in absolute coordinates, so clamping the box at an edge does not shift it
    const mx = x0 + radius
    const my = y0 + radius

    let r = 0, g = 0, b = 0, count = 0

    for (let py = Math.max(0, y0); py < Math.min(height, y0 + size); py++) {
        for (let px = Math.max(0, x0); px < Math.min(width, x0 + size); px++) {
            const dx = px - mx
            const dy = py - my
            if (dx * dx + dy * dy <= radius * radius) {
                const i = (py * width + px) * 4
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

export function extractAverageColorRect(
    pixels: PixelBuffer,
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

    const { data } = pixels
    let r = 0, g = 0, b = 0, count = 0

    for (let py = Math.max(0, sampleY); py < Math.min(pixels.height, sampleY + sampleH); py++) {
        for (let px = Math.max(0, sampleX); px < Math.min(pixels.width, sampleX + sampleW); px++) {
            const i = (py * pixels.width + px) * 4
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
        }
    }

    if (count === 0) return [0, 0, 0]
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
}
