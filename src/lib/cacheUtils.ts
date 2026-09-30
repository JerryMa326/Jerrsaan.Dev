/**
 * Web Cache System for ChemClub Analyst
 *
 * Uses IndexedDB for large binary data (images) and
 * localStorage for smaller JSON-serializable state (shapes, settings, etc.)
 */

import type { Shape, CommittedPoint, DetectionSettings } from '../types'
import type { RegressionModel } from './regressionUtils'
import type { ColorCalibration } from './colorCalibration'

// ============= IndexedDB for Images =============

const DB_NAME = 'ChemClubCache'
const DB_VERSION = 1
const IMAGE_STORE = 'images'

interface CachedImage {
    id: number
    blob?: Blob
    /** Older records stored a PNG data URL instead of the original bytes */
    dataUrl?: string
    width: number
    height: number
}

interface CachedAppState {
    shapes: Shape[]
    regressionModels: Record<string, RegressionModel>
    committedPoints: CommittedPoint[]
    detectionSettings: DetectionSettings
    colorMode: 'RGB' | 'CMYK' | 'HSL' | 'HSV'
    rawRgbMode: boolean
    currentImageIndex: number
    isGridView: boolean
    zoomLevel: number
    rotationAngle: number
    boundingBox: { x: number; y: number; width: number; height: number } | null
    imageCount: number
    /** IndexedDB record ids of the images, in display order */
    imageIds?: number[]
    colorCalibration?: ColorCalibration
    heatmapMode?: boolean
    heatmapChannel?: string
}

let dbInstance: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return dbInstance

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
            dbInstance = request.result
            resolve(dbInstance)
        }

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result

            if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                db.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
            }
        }
    })
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        // Quota errors abort the transaction rather than firing onerror
        tx.onabort = () => reject(tx.error ?? new Error('storage may be full'))
    })
}

// Each image element keeps the same record id for its whole life, so saves
// only write images that are new and delete ones that were removed.
const imageIds = new WeakMap<HTMLImageElement, number>()
let lastImageId = Date.now()

function getImageId(img: HTMLImageElement): number {
    let id = imageIds.get(img)
    if (id === undefined) {
        id = ++lastImageId
        imageIds.set(img, id)
    }
    return id
}

async function imageToBlob(img: HTMLImageElement): Promise<Blob | null> {
    try {
        // The app's images are blob: or data: URLs, so this reads the original file bytes
        const response = await fetch(img.src)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.blob()
    } catch (e) {
        // The image was removed (and its URL released) before this save ran
        console.warn('Skipping image that could not be read for caching:', e)
        return null
    }
}

// ============= Image Cache Operations =============

async function syncCachedImages(images: HTMLImageElement[]): Promise<void> {
    const db = await openDB()
    const wanted = new Map(images.map(img => [getImageId(img), img]))
    const storedKeys = await requestResult(
        db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE).getAllKeys()
    ) as number[]
    const stored = new Set(storedKeys)

    const toDelete = storedKeys.filter(id => !wanted.has(id))
    const toAdd = [...wanted].filter(([id]) => !stored.has(id))
    if (toAdd.length === 0 && toDelete.length === 0) return

    const records: CachedImage[] = []
    for (const [id, img] of toAdd) {
        const blob = await imageToBlob(img)
        if (blob) {
            records.push({ id, blob, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height })
        }
    }

    const tx = db.transaction(IMAGE_STORE, 'readwrite')
    const store = tx.objectStore(IMAGE_STORE)
    records.forEach(record => store.put(record))
    toDelete.forEach(id => store.delete(id))
    await transactionDone(tx)
}

let imageSync: Promise<void> = Promise.resolve()
let lastSyncedImages: HTMLImageElement[] | null = null

/** Runs image syncs one at a time, so an older save can never land after a newer one */
function queueImageSync(images: HTMLImageElement[]): Promise<void> {
    const run = imageSync.then(async () => {
        if (images === lastSyncedImages) return
        await syncCachedImages(images)
        lastSyncedImages = images
    })
    imageSync = run.catch(() => { })
    return run
}

/**
 * Loads cached images. With `ids` (the saved display order) the result has one
 * entry per id, null where that image is missing or failed to load, so callers
 * can drop the shapes that belonged to it. Without `ids` (older caches) it
 * returns every record that loads, in id order.
 */
export async function loadCachedImages(ids?: number[]): Promise<(HTMLImageElement | null)[]> {
    try {
        const db = await openDB()
        const records = await requestResult(
            db.transaction(IMAGE_STORE, 'readonly').objectStore(IMAGE_STORE).getAll()
        ) as CachedImage[]
        const byId = new Map(records.map(r => [r.id, r]))
        const order = ids ?? records.map(r => r.id).sort((a, b) => a - b)

        const images: (HTMLImageElement | null)[] = []
        for (const id of order) {
            const record = byId.get(id)
            const img = record ? await recordToImage(record) : null
            if (img) {
                imageIds.set(img, id)
                lastImageId = Math.max(lastImageId, id)
            }
            if (img || ids) images.push(img)
        }
        return images
    } catch (error) {
        console.error('Error loading cached images:', error)
        return ids ? ids.map(() => null) : []
    }
}

async function recordToImage(record: CachedImage): Promise<HTMLImageElement | null> {
    const src = record.blob ? URL.createObjectURL(record.blob) : record.dataUrl
    if (!src) return null
    try {
        return await loadImage(src)
    } catch (e) {
        console.error('Error loading cached image:', e)
        if (record.blob) URL.revokeObjectURL(src)
        return null
    }
}

/**
 * After a restore where some images failed to load, shifts shapes so they point
 * at the right image again. Shapes whose image is gone are kept with imageIndex
 * -1: they no longer show on any photo, but their colors and labels stay in the
 * regression and the CSV export.
 */
export function remapAfterMissingImages(
    shapes: Shape[],
    currentImageIndex: number,
    loaded: boolean[]
): { shapes: Shape[]; currentImageIndex: number } {
    const newIndex: number[] = []
    let next = 0
    for (const ok of loaded) newIndex.push(ok ? next++ : -1)

    const remapped = shapes.map(s => {
        const index = newIndex[s.imageIndex] ?? -1
        return index === s.imageIndex ? s : { ...s, imageIndex: index }
    })

    // Stay on the same image, or the nearest earlier one that loaded
    let current = 0
    for (let i = Math.min(currentImageIndex, loaded.length - 1); i >= 0; i--) {
        if (newIndex[i] >= 0) {
            current = newIndex[i]
            break
        }
    }
    return { shapes: remapped, currentImageIndex: current }
}

export async function clearCachedImages(): Promise<void> {
    try {
        const db = await openDB()
        const tx = db.transaction(IMAGE_STORE, 'readwrite')
        const store = tx.objectStore(IMAGE_STORE)
        store.clear()

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    } catch (error) {
        console.error('Error clearing cached images:', error)
    }
}

// ============= LocalStorage for App State =============

const STATE_KEY = 'chemclub_app_state'

/** Throws when storage is full, so the caller can tell the user */
export function cacheAppState(state: CachedAppState): void {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

export function loadCachedAppState(): CachedAppState | null {
    try {
        const data = localStorage.getItem(STATE_KEY)
        if (data) {
            return JSON.parse(data) as CachedAppState
        }
    } catch (error) {
        console.error('Error loading cached app state:', error)
    }
    return null
}

export function clearCachedAppState(): void {
    try {
        localStorage.removeItem(STATE_KEY)
    } catch (error) {
        console.error('Error clearing cached app state:', error)
    }
}

// ============= Combined Cache Operations =============

export async function clearAllCache(): Promise<void> {
    // A save that is still waiting would write everything back right after the clear
    if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
    }
    await imageSync
    await clearCachedImages()
    clearCachedAppState()
    lastSyncedImages = null
}

export function hasCachedData(): boolean {
    return localStorage.getItem(STATE_KEY) !== null
}

// ============= Storage Estimation =============

export async function estimateCacheSize(): Promise<{ used: number; quota: number } | null> {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate()
            return { used: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
        }
    } catch {
        // Storage API not available
    }
    return null
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// ============= Debounced Save Helper =============

type SaveErrorCallback = (error: string) => void

let saveTimeout: ReturnType<typeof setTimeout> | null = null
let _onSaveError: SaveErrorCallback | null = null
let lastReportedError: string | null = null

export function setSaveErrorCallback(cb: SaveErrorCallback | null): void {
    _onSaveError = cb
}

function reportSaveError(msg: string): void {
    // Report a failure once, not again on every later save, until a save succeeds
    if (msg === lastReportedError) return
    lastReportedError = msg
    if (_onSaveError) _onSaveError(msg)
}

type SavedState = Omit<CachedAppState, 'imageCount' | 'imageIds'>

async function saveNow(images: HTMLImageElement[], state: SavedState): Promise<void> {
    try {
        cacheAppState({ ...state, imageCount: images.length, imageIds: images.map(getImageId) })
    } catch (e) {
        // Leave the stored images alone so they still match the last saved state
        reportSaveError(`Failed to save app state: ${e instanceof Error ? e.message : 'storage may be full'}`)
        return
    }
    try {
        await queueImageSync(images)
    } catch (e) {
        reportSaveError(`Failed to cache images: ${e instanceof Error ? e.message : 'storage may be full'}`)
        return
    }
    lastReportedError = null
}

export function debouncedSaveState(images: HTMLImageElement[], state: SavedState): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }

    saveTimeout = setTimeout(() => {
        saveTimeout = null
        void saveNow(images, state)
    }, 500)
}

export function forceSaveState(images: HTMLImageElement[], state: SavedState): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
    }
    void saveNow(images, state)
}

// ============= Well Plate Preset Cache =============

const PLATE_PRESETS_KEY = 'chemclub_plate_presets'

/**
 * A plate preset stores the overlay geometry as fractions of the image size
 * so it can be re-applied to images of similar aspect ratio.
 */
export interface PlatePresetNormalized {
    xFrac: number       // x / imgW
    yFrac: number       // y / imgH
    wFrac: number       // width / imgW
    hFrac: number       // height / imgH
    rotation: number
    wellRadiusFactor: number
}

function getPresetKey(plateSize: number, imgW: number, imgH: number): string {
    // Bucket by plate size + aspect ratio rounded to 1 decimal
    const aspect = Math.round((imgW / imgH) * 10) / 10
    return `${plateSize}_${aspect}`
}

function loadAllPlatePresets(): Record<string, PlatePresetNormalized> {
    try {
        const data = localStorage.getItem(PLATE_PRESETS_KEY)
        if (data) return JSON.parse(data)
    } catch (e) {
        console.error('Error loading plate presets:', e)
    }
    return {}
}

function saveAllPlatePresets(presets: Record<string, PlatePresetNormalized>): void {
    try {
        localStorage.setItem(PLATE_PRESETS_KEY, JSON.stringify(presets))
    } catch (e) {
        console.error('Error saving plate presets:', e)
    }
}

/**
 * Save a confirmed plate overlay as a preset for this plate size + aspect ratio.
 */
export function savePlatePreset(
    plateSize: number,
    imgW: number,
    imgH: number,
    overlay: { x: number; y: number; width: number; height: number; rotation: number; wellRadiusFactor: number }
): void {
    const presets = loadAllPlatePresets()
    const key = getPresetKey(plateSize, imgW, imgH)
    presets[key] = {
        xFrac: overlay.x / imgW,
        yFrac: overlay.y / imgH,
        wFrac: overlay.width / imgW,
        hFrac: overlay.height / imgH,
        rotation: overlay.rotation,
        wellRadiusFactor: overlay.wellRadiusFactor,
    }
    saveAllPlatePresets(presets)
}

/**
 * Load a cached preset for the given plate size + image dimensions.
 * Returns null if no preset exists for this combination.
 */
export function loadPlatePreset(
    plateSize: number,
    imgW: number,
    imgH: number
): { x: number; y: number; width: number; height: number; rotation: number; wellRadiusFactor: number } | null {
    const presets = loadAllPlatePresets()
    const key = getPresetKey(plateSize, imgW, imgH)
    const preset = presets[key]
    if (!preset) return null
    return {
        x: preset.xFrac * imgW,
        y: preset.yFrac * imgH,
        width: preset.wFrac * imgW,
        height: preset.hFrac * imgH,
        rotation: preset.rotation,
        wellRadiusFactor: preset.wellRadiusFactor,
    }
}

