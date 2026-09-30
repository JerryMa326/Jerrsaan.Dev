import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Shape, CommittedPoint, DetectionSettings, AppState } from '../types'
import { defaultDetectionSettings } from '../types'
import type { RegressionModel } from '../lib/regressionUtils'
import type { ColorCalibration } from '../lib/colorCalibration'
import { defaultColorCalibration } from '../lib/colorCalibration'
import { useUndoRedo, getUndoShortcut } from '../hooks/useUndoRedo'
import {
    loadCachedImages,
    loadCachedAppState,
    remapAfterMissingImages,
    debouncedSaveState,
    forceSaveState,
    clearAllCache,
    hasCachedData,
    setSaveErrorCallback
} from '../lib/cacheUtils'

interface AppContextType extends AppState {
    setImages: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>
    setCurrentImageIndex: (index: number) => void
    setShapes: React.Dispatch<React.SetStateAction<Shape[]>>
    addShape: (shape: Shape) => void
    removeShape: (id: string) => void
    updateShape: (id: string, updates: Partial<Shape>) => void
    clearShapesForImage: (imageIndex: number) => void
    removeImage: (imageIndex: number) => void
    clearAllImages: () => void
    regressionModels: Record<string, RegressionModel>
    setRegressionModels: React.Dispatch<React.SetStateAction<Record<string, RegressionModel>>>
    setCommittedPoints: React.Dispatch<React.SetStateAction<CommittedPoint[]>>
    setIsGridView: (isGrid: boolean) => void
    setDetectionSettings: React.Dispatch<React.SetStateAction<DetectionSettings>>
    setColorMode: (mode: 'RGB' | 'CMYK' | 'HSL' | 'HSV') => void
    setRawRgbMode: (raw: boolean) => void
    setZoomLevel: (zoom: number) => void
    setRotationAngle: (angle: number) => void
    setBoundingBox: (box: { x: number; y: number; width: number; height: number } | null) => void
    selectedShapeId: string | null
    setSelectedShapeId: (id: string | null) => void
    calibrationMode: 'none' | 'min' | 'max' | 'white' | 'black'
    setCalibrationMode: (mode: 'none' | 'min' | 'max' | 'white' | 'black') => void
    colorCalibration: ColorCalibration
    setColorCalibration: React.Dispatch<React.SetStateAction<ColorCalibration>>
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
    heatmapMode: boolean
    setHeatmapMode: (mode: boolean) => void
    heatmapChannel: string
    setHeatmapChannel: (channel: string) => void
    // Cache controls
    clearCache: () => Promise<void>
    saveCache: () => void
    isCacheLoaded: boolean
    lastSaveError: string | null
    clearSaveError: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

/** Frees the memory behind photos that were loaded from files */
function releaseImages(images: (HTMLImageElement | undefined)[]): void {
    for (const img of images) {
        if (img?.src.startsWith('blob:')) URL.revokeObjectURL(img.src)
    }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [images, setImages] = useState<HTMLImageElement[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [regressionModels, setRegressionModels] = useState<Record<string, RegressionModel>>({})
    const [committedPoints, setCommittedPoints] = useState<CommittedPoint[]>([])
    const [isGridView, setIsGridView] = useState(false)
    const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>(defaultDetectionSettings)
    const [colorMode, setColorMode] = useState<'RGB' | 'CMYK' | 'HSL' | 'HSV'>('RGB')
    const [rawRgbMode, setRawRgbMode] = useState(true)
    const [zoomLevel, setZoomLevel] = useState(1)
    const [rotationAngle, setRotationAngle] = useState(0)
    const [boundingBox, setBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
    const [calibrationMode, setCalibrationMode] = useState<'none' | 'min' | 'max' | 'white' | 'black'>('none')
    const [colorCalibration, setColorCalibration] = useState<ColorCalibration>(defaultColorCalibration)
    const [heatmapMode, setHeatmapMode] = useState(false)
    const [heatmapChannel, setHeatmapChannel] = useState('magnitude')
    const [isCacheLoaded, setIsCacheLoaded] = useState(false)
    const [lastSaveError, setLastSaveError] = useState<string | null>(null)

    // setShapesInternal replaces shapes without an undo step and clears history
    const { shapes, edit: pushAndSet, reset: setShapesInternal, undo, redo, canUndo, canRedo } = useUndoRedo()
    const isInitializing = useRef(true)
    const imagesRef = useRef(images)

    useEffect(() => {
        imagesRef.current = images
    }, [images])

    // Register save error callback
    useEffect(() => {
        setSaveErrorCallback((msg) => setLastSaveError(msg))
        return () => setSaveErrorCallback(null)
    }, [])

    // Restore cached data on mount
    useEffect(() => {
        async function restoreCache() {
            if (!hasCachedData()) {
                isInitializing.current = false
                setIsCacheLoaded(true)
                return
            }

            try {
                const cachedState = loadCachedAppState()
                const cachedSlots = await loadCachedImages(cachedState?.imageIds)
                const cachedImages = cachedSlots.filter((img): img is HTMLImageElement => img !== null)
                if (cachedImages.length > 0) {
                    // Restored photos go first, ahead of any added while the restore was running
                    setImages(prev => [...cachedImages, ...prev])
                }

                if (cachedState) {
                    // Detach shapes whose photo failed to load, so none end up on the wrong photo
                    const restored = remapAfterMissingImages(
                        cachedState.shapes || [],
                        cachedState.currentImageIndex || 0,
                        cachedSlots.map(img => img !== null)
                    )
                    setShapesInternal(prev => [
                        ...restored.shapes,
                        ...prev.map(s => s.imageIndex >= 0 ? { ...s, imageIndex: s.imageIndex + cachedImages.length } : s)
                    ])
                    setRegressionModels(cachedState.regressionModels || {})
                    setCommittedPoints(cachedState.committedPoints || [])
                    setDetectionSettings(cachedState.detectionSettings || defaultDetectionSettings)
                    setColorMode(cachedState.colorMode || 'RGB')
                    setRawRgbMode(cachedState.rawRgbMode ?? true)
                    setCurrentImageIndex(Math.min(restored.currentImageIndex, Math.max(0, cachedImages.length - 1)))
                    setIsGridView(cachedState.isGridView ?? false)
                    setZoomLevel(cachedState.zoomLevel || 1)
                    setRotationAngle(cachedState.rotationAngle || 0)
                    setBoundingBox(cachedState.boundingBox || null)
                    if (cachedState.colorCalibration) {
                        setColorCalibration(cachedState.colorCalibration)
                    }
                    setHeatmapMode(cachedState.heatmapMode ?? false)
                    setHeatmapChannel(cachedState.heatmapChannel ?? 'magnitude')
                }
            } catch (error) {
                console.error('Error restoring cache:', error)
            } finally {
                isInitializing.current = false
                setIsCacheLoaded(true)
            }
        }

        restoreCache()
    }, [setShapesInternal])

    // Auto-save state when it changes (debounced)
    useEffect(() => {
        if (isInitializing.current) return

        debouncedSaveState(images, {
            shapes,
            regressionModels,
            committedPoints,
            detectionSettings,
            colorMode,
            rawRgbMode,
            currentImageIndex,
            isGridView,
            zoomLevel,
            rotationAngle,
            boundingBox,
            colorCalibration,
            heatmapMode,
            heatmapChannel
        })
    }, [
        images, shapes, regressionModels, committedPoints,
        detectionSettings, colorMode, rawRgbMode, currentImageIndex,
        isGridView, zoomLevel, rotationAngle, boundingBox, colorCalibration,
        heatmapMode, heatmapChannel
    ])

    const clearCache = useCallback(async () => {
        await clearAllCache()
    }, [])

    const clearSaveError = useCallback(() => setLastSaveError(null), [])

    const saveCache = useCallback(() => {
        forceSaveState(images, {
            shapes,
            regressionModels,
            committedPoints,
            detectionSettings,
            colorMode,
            rawRgbMode,
            currentImageIndex,
            isGridView,
            zoomLevel,
            rotationAngle,
            boundingBox,
            colorCalibration,
            heatmapMode,
            heatmapChannel
        })
    }, [
        images, shapes, regressionModels, committedPoints,
        detectionSettings, colorMode, rawRgbMode, currentImageIndex,
        isGridView, zoomLevel, rotationAngle, boundingBox, colorCalibration,
        heatmapMode, heatmapChannel
    ])

    const setShapes: React.Dispatch<React.SetStateAction<Shape[]>> = useCallback((action) => {
        if (typeof action === 'function') {
            pushAndSet(action)
        } else {
            pushAndSet(() => action)
        }
    }, [pushAndSet])

    const addShape = useCallback((shape: Shape) => {
        pushAndSet(prev => [...prev, shape])
    }, [pushAndSet])

    const removeShape = useCallback((id: string) => {
        pushAndSet(prev => prev.filter(s => s.id !== id))
    }, [pushAndSet])

    const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
        pushAndSet(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    }, [pushAndSet])

    const clearShapesForImage = useCallback((imageIndex: number) => {
        pushAndSet(prev => prev.filter(s => s.imageIndex !== imageIndex))
    }, [pushAndSet])

    // Undo history only covers shapes, so removing photos starts it fresh:
    // an older step would put shapes back on the wrong photo.
    const removeImage = useCallback((imageIndex: number) => {
        releaseImages([imagesRef.current[imageIndex]])
        setImages(prev => prev.filter((_, i) => i !== imageIndex))
        setShapesInternal(prev =>
            prev
                .filter(s => s.imageIndex !== imageIndex)
                .map(s => s.imageIndex > imageIndex ? { ...s, imageIndex: s.imageIndex - 1 } : s)
        )
        setCurrentImageIndex(current => current >= imageIndex && current > 0 ? current - 1 : current)
    }, [setShapesInternal])

    const clearAllImages = useCallback(() => {
        releaseImages(imagesRef.current)
        setImages([])
        setShapesInternal([])
        setCurrentImageIndex(0)
        setCommittedPoints([])
        setRegressionModels({})
        setBoundingBox(null)
        setSelectedShapeId(null)
    }, [setShapesInternal])

    // Global keyboard shortcuts for undo/redo
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const action = getUndoShortcut(e)
            if (!action) return
            e.preventDefault()
            if (action === 'redo') {
                redo()
            } else {
                undo()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [undo, redo])

    return (
        <AppContext.Provider value={{
            images, setImages,
            currentImageIndex, setCurrentImageIndex,
            shapes, setShapes,
            addShape, removeShape, updateShape, clearShapesForImage, removeImage, clearAllImages,
            regressionModels, setRegressionModels,
            committedPoints, setCommittedPoints,
            isGridView, setIsGridView,
            detectionSettings, setDetectionSettings,
            colorMode, setColorMode,
            rawRgbMode, setRawRgbMode,
            zoomLevel, setZoomLevel,
            rotationAngle, setRotationAngle,
            boundingBox, setBoundingBox,
            selectedShapeId, setSelectedShapeId,
            calibrationMode, setCalibrationMode,
            colorCalibration, setColorCalibration,
            heatmapMode, setHeatmapMode,
            heatmapChannel, setHeatmapChannel,
            undo, redo,
            canUndo,
            canRedo,
            clearCache, saveCache, isCacheLoaded,
            lastSaveError, clearSaveError
        }}>
            {children}
        </AppContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
    const context = useContext(AppContext)
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider')
    }
    return context
}
