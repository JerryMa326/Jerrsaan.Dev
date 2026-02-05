/**
 * Web Cache System for ChemClub Analyst
 * 
 * Uses IndexedDB for large binary data (images) and 
 * localStorage for smaller JSON-serializable state (shapes, settings, etc.)
 */

import type { Shape, CalibrationData, RegressionModel, CommittedPoint, DetectionSettings } from '../types'

// ============= IndexedDB for Images =============

const DB_NAME = 'ChemClubCache'
const DB_VERSION = 1
const IMAGE_STORE = 'images'

interface CachedImage {
    id: number
    dataUrl: string
    width: number
    height: number
}

interface CachedAppState {
    shapes: Shape[]
    calibrationData: CalibrationData
    regressionModels: Record<string, RegressionModel>
    committedPoints: CommittedPoint[]
    detectionSettings: DetectionSettings
    colorMode: 'RGB' | 'CMYK'
    rawRgbMode: boolean
    currentImageIndex: number
    isGridView: boolean
    zoomLevel: number
    rotationAngle: number
    boundingBox: { x: number; y: number; width: number; height: number } | null
    imageCount: number
}

let dbInstance: IDBDatabase | null = null

/**
 * Opens and returns the IndexedDB instance
 */
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

            // Create object store for images
            if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                db.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
            }
        }
    })
}

/**
 * Converts an HTMLImageElement to a data URL
 */
function imageToDataUrl(img: HTMLImageElement): string {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/png')
}

/**
 * Converts a data URL back to an HTMLImageElement
 */
function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = dataUrl
    })
}

// ============= Image Cache Operations =============

/**
 * Saves images to IndexedDB
 */
export async function cacheImages(images: HTMLImageElement[]): Promise<void> {
    try {
        const db = await openDB()
        const tx = db.transaction(IMAGE_STORE, 'readwrite')
        const store = tx.objectStore(IMAGE_STORE)

        // Clear existing images
        store.clear()

        // Add each image
        images.forEach((img, index) => {
            const cachedImage: CachedImage = {
                id: index,
                dataUrl: imageToDataUrl(img),
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height
            }
            store.add(cachedImage)
        })

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    } catch (error) {
        console.error('Error caching images:', error)
    }
}

/**
 * Loads images from IndexedDB
 */
export async function loadCachedImages(): Promise<HTMLImageElement[]> {
    try {
        const db = await openDB()
        const tx = db.transaction(IMAGE_STORE, 'readonly')
        const store = tx.objectStore(IMAGE_STORE)
        const request = store.getAll()

        return new Promise((resolve, reject) => {
            request.onsuccess = async () => {
                const cachedImages = request.result as CachedImage[]
                // Sort by id to maintain order
                cachedImages.sort((a, b) => a.id - b.id)

                const images: HTMLImageElement[] = []
                for (const cached of cachedImages) {
                    try {
                        const img = await dataUrlToImage(cached.dataUrl)
                        images.push(img)
                    } catch (e) {
                        console.error('Error loading cached image:', e)
                    }
                }
                resolve(images)
            }
            request.onerror = () => reject(request.error)
        })
    } catch (error) {
        console.error('Error loading cached images:', error)
        return []
    }
}

/**
 * Clears all cached images
 */
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

/**
 * Saves app state to localStorage
 */
export function cacheAppState(state: CachedAppState): void {
    try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch (error) {
        console.error('Error caching app state:', error)
    }
}

/**
 * Loads app state from localStorage
 */
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

/**
 * Clears all cached app state
 */
export function clearCachedAppState(): void {
    try {
        localStorage.removeItem(STATE_KEY)
    } catch (error) {
        console.error('Error clearing cached app state:', error)
    }
}

// ============= Combined Cache Operations =============

/**
 * Clears all cached data (images and state)
 */
export async function clearAllCache(): Promise<void> {
    await clearCachedImages()
    clearCachedAppState()
}

/**
 * Check if cache exists
 */
export function hasCachedData(): boolean {
    return localStorage.getItem(STATE_KEY) !== null
}

// ============= Debounced Save Helper =============

let saveTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Debounced save function to prevent excessive writes
 * Waits 500ms after the last call before saving
 */
export function debouncedSaveState(
    images: HTMLImageElement[],
    state: Omit<CachedAppState, 'imageCount'>
): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }

    saveTimeout = setTimeout(() => {
        // Save state to localStorage
        cacheAppState({ ...state, imageCount: images.length })

        // Save images to IndexedDB (only if image count changed)
        const cachedState = loadCachedAppState()
        if (!cachedState || cachedState.imageCount !== images.length) {
            cacheImages(images)
        }
    }, 500)
}

/**
 * Force save immediately without debounce
 */
export function forceSaveState(
    images: HTMLImageElement[],
    state: Omit<CachedAppState, 'imageCount'>
): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }
    cacheAppState({ ...state, imageCount: images.length })
    cacheImages(images)
}
