export type Point = { x: number; y: number }

export type ShapeType = 'rectangle' | 'circle'

export interface Shape {
    id: string
    label: string
    type: ShapeType
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    color: [number, number, number]
    imageIndex: number
    auto?: boolean
}

export interface CalibrationData {
    red: [number, number, number] | null
    green: [number, number, number] | null
    blue: [number, number, number] | null
    yellow: [number, number, number] | null
    pink: [number, number, number] | null
}

export interface RegressionModel {
    m: number
    b: number
    r2: number
}

export interface CommittedPoint {
    label: string
    y: number
}

export interface DetectionSettings {
    mode: 'circle' | 'rectangle'
    param1: number
    param2: number
    minRadius: number
    maxRadius: number
    restrictedArea: number
    minArea: number
    maxArea: number
    epsilon: number
}

export interface AppState {
    images: HTMLImageElement[]
    currentImageIndex: number
    shapes: Shape[]
    calibrationData: CalibrationData
    regressionModels: Record<string, RegressionModel>
    committedPoints: CommittedPoint[]
    isGridView: boolean
    detectionSettings: DetectionSettings
    colorMode: 'RGB' | 'CMYK'
    rawRgbMode: boolean
    zoomLevel: number
    rotationAngle: number
    boundingBox: { x: number; y: number; width: number; height: number } | null
}

export const defaultDetectionSettings: DetectionSettings = {
    mode: 'circle',
    param1: 30,
    param2: 40,
    minRadius: 10,
    maxRadius: 100,
    restrictedArea: 70,
    minArea: 500,
    maxArea: 10000,
    epsilon: 0.02
}
