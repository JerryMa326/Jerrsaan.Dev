import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Shape } from '@/types'
import {
    remapAfterMissingImages,
    debouncedSaveState,
    clearAllCache,
    setSaveErrorCallback
} from '@/lib/cacheUtils'
import { defaultDetectionSettings } from '@/types'
import { defaultColorCalibration } from '@/lib/colorCalibration'

function shape(id: string, imageIndex: number): Shape {
    return { id, label: id, type: 'circle', x: 0, y: 0, radius: 5, color: [0, 0, 0], imageIndex }
}

const state = {
    shapes: [],
    regressionModels: {},
    committedPoints: [],
    detectionSettings: defaultDetectionSettings,
    colorMode: 'RGB' as const,
    rawRgbMode: true,
    currentImageIndex: 0,
    isGridView: false,
    zoomLevel: 1,
    rotationAngle: 0,
    boundingBox: null,
    colorCalibration: defaultColorCalibration,
    heatmapMode: false,
    heatmapChannel: 'magnitude'
}

// ─── remapAfterMissingImages ────────────────────────────────────────────────────

describe('remapAfterMissingImages', () => {
    it('keeps everything when all images loaded', () => {
        const shapes = [shape('a', 0), shape('b', 1)]
        const result = remapAfterMissingImages(shapes, 1, [true, true])
        expect(result.shapes).toEqual(shapes)
        expect(result.currentImageIndex).toBe(1)
    })

    it('detaches shapes of a missing image and moves later shapes down', () => {
        const shapes = [shape('a', 0), shape('b', 1), shape('c', 2)]
        const result = remapAfterMissingImages(shapes, 2, [true, false, true])
        expect(result.shapes.map(s => [s.id, s.imageIndex])).toEqual([['a', 0], ['b', -1], ['c', 1]])
        expect(result.currentImageIndex).toBe(1)
    })

    it('falls back to the nearest earlier image when the current one is missing', () => {
        const result = remapAfterMissingImages([], 2, [true, true, false])
        expect(result.currentImageIndex).toBe(1)
    })

    it('detaches shapes that point past the loaded images', () => {
        const result = remapAfterMissingImages([shape('a', 0), shape('b', 3)], 0, [true])
        expect(result.shapes.map(s => [s.id, s.imageIndex])).toEqual([['a', 0], ['b', -1]])
    })

    it('never drops a shape', () => {
        const shapes = [shape('a', -1), shape('b', 0), shape('c', 1)]
        const result = remapAfterMissingImages(shapes, 0, [false, true])
        expect(result.shapes.map(s => [s.id, s.imageIndex])).toEqual([['a', -1], ['b', -1], ['c', 0]])
    })

    it('handles no images at all', () => {
        const result = remapAfterMissingImages([shape('a', 0)], 0, [false])
        expect(result.shapes.map(s => [s.id, s.imageIndex])).toEqual([['a', -1]])
        expect(result.currentImageIndex).toBe(0)
    })
})

// ─── saving ─────────────────────────────────────────────────────────────────────

describe('saving app state', () => {
    let store: Record<string, string>
    let setItem: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.useFakeTimers()
        store = {}
        setItem = vi.fn((key: string, value: string) => { store[key] = value })
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store[key] ?? null,
            setItem,
            removeItem: (key: string) => { delete store[key] }
        })
        // No IndexedDB in the test environment: image caching fails and is reported
        vi.spyOn(console, 'error').mockImplementation(() => { })
    })

    afterEach(() => {
        setSaveErrorCallback(null)
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('reports a full storage error to the user', async () => {
        const onError = vi.fn()
        setSaveErrorCallback(onError)
        setItem.mockImplementation(() => { throw new Error('quota exceeded') })

        debouncedSaveState([], state)
        await vi.advanceTimersByTimeAsync(600)

        expect(onError).toHaveBeenCalledWith('Failed to save app state: quota exceeded')
    })

    it('reports the same failure only once until a save succeeds', async () => {
        const onError = vi.fn()
        setSaveErrorCallback(onError)
        setItem.mockImplementation(() => { throw new Error('disk full') })

        debouncedSaveState([], state)
        await vi.advanceTimersByTimeAsync(600)
        debouncedSaveState([], state)
        await vi.advanceTimersByTimeAsync(600)

        expect(onError).toHaveBeenCalledTimes(1)
    })

    it('does not write the state back after the cache is cleared', async () => {
        debouncedSaveState([], state)
        await clearAllCache()
        await vi.advanceTimersByTimeAsync(600)

        expect(setItem).not.toHaveBeenCalled()
        expect(store).toEqual({})
    })
})
