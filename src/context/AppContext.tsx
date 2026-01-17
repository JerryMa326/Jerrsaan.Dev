import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Shape, CalibrationData, RegressionModel, CommittedPoint, DetectionSettings, AppState } from '../types'
import { defaultDetectionSettings } from '../types'

interface AppContextType extends AppState {
    setImages: React.Dispatch<React.SetStateAction<HTMLImageElement[]>>
    setCurrentImageIndex: (index: number) => void
    setShapes: React.Dispatch<React.SetStateAction<Shape[]>>
    addShape: (shape: Shape) => void
    removeShape: (id: string) => void
    updateShape: (id: string, updates: Partial<Shape>) => void
    clearShapesForImage: (imageIndex: number) => void
    removeImage: (imageIndex: number) => void
    setCalibrationData: React.Dispatch<React.SetStateAction<CalibrationData>>
    setRegressionModels: React.Dispatch<React.SetStateAction<Record<string, RegressionModel>>>
    setCommittedPoints: React.Dispatch<React.SetStateAction<CommittedPoint[]>>
    setIsGridView: (isGrid: boolean) => void
    setDetectionSettings: React.Dispatch<React.SetStateAction<DetectionSettings>>
    setColorMode: (mode: 'RGB' | 'CMYK') => void
    setRawRgbMode: (raw: boolean) => void
    setZoomLevel: (zoom: number) => void
    setRotationAngle: (angle: number) => void
    setBoundingBox: (box: { x: number; y: number; width: number; height: number } | null) => void
    selectedShapeId: string | null
    setSelectedShapeId: (id: string | null) => void
    calibrationMode: 'none' | 'min' | 'max'
    setCalibrationMode: (mode: 'none' | 'min' | 'max') => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [images, setImages] = useState<HTMLImageElement[]>([])
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [shapes, setShapes] = useState<Shape[]>([])
    const [calibrationData, setCalibrationData] = useState<CalibrationData>({
        red: null, green: null, blue: null, yellow: null, pink: null
    })
    const [regressionModels, setRegressionModels] = useState<Record<string, RegressionModel>>({})
    const [committedPoints, setCommittedPoints] = useState<CommittedPoint[]>([])
    const [isGridView, setIsGridView] = useState(false)
    const [detectionSettings, setDetectionSettings] = useState<DetectionSettings>(defaultDetectionSettings)
    const [colorMode, setColorMode] = useState<'RGB' | 'CMYK'>('RGB')
    const [rawRgbMode, setRawRgbMode] = useState(true)
    const [zoomLevel, setZoomLevel] = useState(1)
    const [rotationAngle, setRotationAngle] = useState(0)
    const [boundingBox, setBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
    const [calibrationMode, setCalibrationMode] = useState<'none' | 'min' | 'max'>('none')

    const addShape = useCallback((shape: Shape) => {
        setShapes(prev => [...prev, shape])
    }, [])

    const removeShape = useCallback((id: string) => {
        setShapes(prev => prev.filter(s => s.id !== id))
    }, [])

    const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
        setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    }, [])

    const clearShapesForImage = useCallback((imageIndex: number) => {
        setShapes(prev => prev.filter(s => s.imageIndex !== imageIndex))
    }, [])

    const removeImage = useCallback((imageIndex: number) => {
        setImages(prev => prev.filter((_, i) => i !== imageIndex))
        setShapes(prev => {
            // Remove shapes for that image and decrement imageIndex for shapes after
            return prev
                .filter(s => s.imageIndex !== imageIndex)
                .map(s => s.imageIndex > imageIndex ? { ...s, imageIndex: s.imageIndex - 1 } : s)
        })
        if (currentImageIndex >= imageIndex && currentImageIndex > 0) {
            setCurrentImageIndex(currentImageIndex - 1)
        }
    }, [currentImageIndex])

    return (
        <AppContext.Provider value={{
            images, setImages,
            currentImageIndex, setCurrentImageIndex,
            shapes, setShapes,
            addShape, removeShape, updateShape, clearShapesForImage, removeImage,
            calibrationData, setCalibrationData,
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
            calibrationMode, setCalibrationMode
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const context = useContext(AppContext)
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider')
    }
    return context
}
