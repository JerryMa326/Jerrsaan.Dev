import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import type { Shape } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { ZoomIn, ZoomOut, Maximize, MousePointer2, Circle, Square, RotateCcw, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { extractColorFromShape } from '@/lib/imageUtils'

export function ImageViewer() {
    const {
        images, currentImageIndex, shapes, addShape,
        zoomLevel, setZoomLevel, rotationAngle, setRotationAngle,
        detectionSettings
    } = useApp()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    const [drawingMode, setDrawingMode] = useState<'none' | 'rectangle' | 'circle'>(
        detectionSettings.mode
    )
    const [isDrawing, setIsDrawing] = useState(false)
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
    const [currentDraftShape, setCurrentDraftShape] = useState<Partial<Shape> | null>(null)
    const [spacePressed, setSpacePressed] = useState(false)
    const [lastTouchDist, setLastTouchDist] = useState(0)
    const [isTouchPanning, setIsTouchPanning] = useState(false)

    const currentImage = images[currentImageIndex]

    // Sync drawing mode with detection settings
    useEffect(() => {
        setDrawingMode(detectionSettings.mode === 'circle' ? 'circle' : 'rectangle')
    }, [detectionSettings.mode])

    // Reset view when image changes
    useEffect(() => {
        setOffset({ x: 0, y: 0 })
    }, [currentImageIndex])

    // Keyboard handler for spacebar pan
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault()
                setSpacePressed(true)
            }
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setSpacePressed(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [])

    // Draw canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas || !currentImage) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotationAngle * Math.PI) / 180)
        ctx.scale(zoomLevel, zoomLevel)
        ctx.translate(-currentImage.width / 2 + offset.x / zoomLevel, -currentImage.height / 2 + offset.y / zoomLevel)

        ctx.drawImage(currentImage, 0, 0)

        // Draw shapes
        const currentShapes = shapes.filter(s => s.imageIndex === currentImageIndex)

        currentShapes.forEach(shape => {
            ctx.lineWidth = 2 / zoomLevel

            if (shape.type === 'rectangle') {
                // Draw outer rectangle
                ctx.beginPath()
                ctx.strokeStyle = '#3b82f6'
                ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
                ctx.rect(shape.x, shape.y, shape.width || 0, shape.height || 0)
                ctx.fill()
                ctx.stroke()

                // Draw sample area rectangle (inner)
                const sampleFactor = detectionSettings.restrictedArea / 100
                const margin = (1 - sampleFactor) / 2
                const sampleX = shape.x + (shape.width || 0) * margin
                const sampleY = shape.y + (shape.height || 0) * margin
                const sampleW = (shape.width || 0) * sampleFactor
                const sampleH = (shape.height || 0) * sampleFactor
                ctx.beginPath()
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'
                ctx.setLineDash([3 / zoomLevel, 3 / zoomLevel])
                ctx.rect(sampleX, sampleY, sampleW, sampleH)
                ctx.stroke()
                ctx.setLineDash([])
            } else if (shape.type === 'circle') {
                // Draw outer circle
                ctx.beginPath()
                ctx.strokeStyle = '#22c55e'
                ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'
                ctx.arc(shape.x, shape.y, shape.radius || 0, 0, 2 * Math.PI)
                ctx.fill()
                ctx.stroke()

                // Draw sample area circle (inner)
                const sampleRadius = (shape.radius || 0) * (detectionSettings.restrictedArea / 100)
                ctx.beginPath()
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'
                ctx.setLineDash([3 / zoomLevel, 3 / zoomLevel])
                ctx.arc(shape.x, shape.y, sampleRadius, 0, 2 * Math.PI)
                ctx.stroke()
                ctx.setLineDash([])
            }

            // Label
            ctx.fillStyle = 'white'
            ctx.strokeStyle = 'black'
            ctx.lineWidth = 3 / zoomLevel
            ctx.font = `bold ${14 / zoomLevel}px sans-serif`
            const labelX = shape.type === 'circle' ? shape.x - 5 / zoomLevel : shape.x
            const labelY = shape.type === 'circle' ? shape.y - (shape.radius || 0) - 5 / zoomLevel : shape.y - 5 / zoomLevel
            ctx.strokeText(shape.label, labelX, labelY)
            ctx.fillText(shape.label, labelX, labelY)
        })

        // Draw draft shape
        if (currentDraftShape && isDrawing) {
            ctx.beginPath()
            ctx.lineWidth = 2 / zoomLevel
            ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel])
            if (drawingMode === 'rectangle') {
                ctx.strokeStyle = '#3b82f6'
                ctx.rect(currentDraftShape.x!, currentDraftShape.y!, currentDraftShape.width!, currentDraftShape.height!)
            } else if (drawingMode === 'circle') {
                ctx.strokeStyle = '#22c55e'
                ctx.arc(currentDraftShape.x!, currentDraftShape.y!, currentDraftShape.radius!, 0, 2 * Math.PI)
            }
            ctx.stroke()
            ctx.setLineDash([])
        }

        ctx.restore()
    }, [currentImage, zoomLevel, rotationAngle, offset, shapes, currentImageIndex, currentDraftShape, isDrawing, drawingMode, detectionSettings.restrictedArea])

    useEffect(() => {
        draw()
    }, [draw])

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth
                canvasRef.current.height = containerRef.current.clientHeight
                draw()
            }
        }
        window.addEventListener('resize', handleResize)
        handleResize()
        return () => window.removeEventListener('resize', handleResize)
    }, [draw])

    const getImagePoint = (e: React.MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas || !currentImage) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()

        // Get canvas-relative coordinates
        const canvasX = e.clientX - rect.left
        const canvasY = e.clientY - rect.top

        // Reverse the transformations
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        // Translate to center
        let x = canvasX - centerX
        let y = canvasY - centerY

        // Reverse rotation
        const rad = (-rotationAngle * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const rx = x * cos - y * sin
        const ry = x * sin + y * cos

        // Reverse scale and offset
        x = rx / zoomLevel + currentImage.width / 2 - offset.x / zoomLevel
        y = ry / zoomLevel + currentImage.height / 2 - offset.y / zoomLevel

        return { x, y }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        // Pan mode: middle click, alt+click, none mode, or spacebar
        if (e.button === 1 || (e.button === 0 && e.altKey) || drawingMode === 'none' || spacePressed) {
            setIsDragging(true)
            setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
            return
        }

        // Start drawing (we only get here if drawingMode is not 'none' due to early return above)
        setIsDrawing(true)
        const pt = getImagePoint(e)
        setDrawStart(pt)
        setCurrentDraftShape({
            x: pt.x,
            y: pt.y,
            width: 0,
            height: 0,
            radius: 0
        })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            })
            return
        }

        if (isDrawing && currentDraftShape) {
            const pt = getImagePoint(e)
            if (drawingMode === 'rectangle') {
                setCurrentDraftShape({
                    ...currentDraftShape,
                    width: pt.x - drawStart.x,
                    height: pt.y - drawStart.y
                })
            } else if (drawingMode === 'circle') {
                const dx = pt.x - drawStart.x
                const dy = pt.y - drawStart.y
                const radius = Math.sqrt(dx * dx + dy * dy)
                setCurrentDraftShape({
                    ...currentDraftShape,
                    radius
                })
            }
        }
    }

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false)
            return
        }

        if (isDrawing && currentDraftShape && currentImage) {
            setIsDrawing(false)

            // Validate shape size
            const minSize = 5
            if (drawingMode === 'rectangle') {
                if (Math.abs(currentDraftShape.width || 0) < minSize || Math.abs(currentDraftShape.height || 0) < minSize) {
                    setCurrentDraftShape(null)
                    return
                }
            } else if ((currentDraftShape.radius || 0) < minSize) {
                setCurrentDraftShape(null)
                return
            }

            const newShape: Shape = {
                id: uuidv4(),
                label: getNextLabel(),
                type: drawingMode as 'rectangle' | 'circle',
                x: currentDraftShape.x!,
                y: currentDraftShape.y!,
                width: currentDraftShape.width,
                height: currentDraftShape.height,
                radius: currentDraftShape.radius,
                color: [0, 0, 0],
                imageIndex: currentImageIndex
            }

            // Extract color
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = currentImage.width
            tempCanvas.height = currentImage.height
            const tempCtx = tempCanvas.getContext('2d')
            if (tempCtx) {
                tempCtx.drawImage(currentImage, 0, 0)
                newShape.color = extractColorFromShape(tempCtx, newShape)
            }

            addShape(newShape)
            setCurrentDraftShape(null)
        }
    }

    const getNextLabel = () => {
        const labels = 'abcdefghijklmnopqrstuvwxyz'
        const usedLabels = new Set(shapes.map(s => s.label))
        for (const char of labels) {
            if (!usedLabels.has(char)) return char
        }
        return '?'
    }

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = -e.deltaY * 0.001
        const newZoom = Math.min(Math.max(0.1, zoomLevel + delta), 10)
        setZoomLevel(newZoom)
    }

    // Touch handlers for mobile
    const getTouchPoint = (touch: React.Touch) => {
        const canvas = canvasRef.current
        if (!canvas || !currentImage) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()

        const canvasX = touch.clientX - rect.left
        const canvasY = touch.clientY - rect.top

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        let x = canvasX - centerX
        let y = canvasY - centerY

        const rad = (-rotationAngle * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const rx = x * cos - y * sin
        const ry = x * sin + y * cos

        x = rx / zoomLevel + currentImage.width / 2 - offset.x / zoomLevel
        y = ry / zoomLevel + currentImage.height / 2 - offset.y / zoomLevel

        return { x, y }
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch zoom start
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            setLastTouchDist(dist)
            setIsTouchPanning(true)
        } else if (e.touches.length === 1) {
            const touch = e.touches[0]
            if (drawingMode === 'none') {
                // Pan mode
                setIsTouchPanning(true)
                setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y })
            } else {
                // Draw mode
                const pt = getTouchPoint(touch)
                setIsDrawing(true)
                setDrawStart(pt)
                setCurrentDraftShape({
                    x: pt.x,
                    y: pt.y,
                    width: 0,
                    height: 0,
                    radius: 0
                })
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDist > 0) {
            // Pinch zoom
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            const scale = dist / lastTouchDist
            setZoomLevel(Math.min(Math.max(0.1, zoomLevel * scale), 10))
            setLastTouchDist(dist)
        } else if (e.touches.length === 1) {
            const touch = e.touches[0]
            if (isTouchPanning && drawingMode === 'none') {
                setOffset({
                    x: touch.clientX - dragStart.x,
                    y: touch.clientY - dragStart.y
                })
            } else if (isDrawing && currentDraftShape) {
                const pt = getTouchPoint(touch)
                if (drawingMode === 'rectangle') {
                    setCurrentDraftShape({
                        ...currentDraftShape,
                        width: pt.x - drawStart.x,
                        height: pt.y - drawStart.y
                    })
                } else if (drawingMode === 'circle') {
                    const dx = pt.x - drawStart.x
                    const dy = pt.y - drawStart.y
                    const radius = Math.sqrt(dx * dx + dy * dy)
                    setCurrentDraftShape({
                        ...currentDraftShape,
                        radius
                    })
                }
            }
        }
    }

    const handleTouchEnd = () => {
        setLastTouchDist(0)
        setIsTouchPanning(false)
        handleMouseUp()
    }

    return (
        <div className="relative w-full h-full bg-neutral-900 overflow-hidden pb-14 md:pb-0" ref={containerRef}>
            <canvas
                ref={canvasRef}
                className={`block touch-none ${isDragging ? 'cursor-grabbing' : (spacePressed || drawingMode === 'none') ? 'cursor-grab' : 'cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />

            {/* Drawing Tools - Responsive */}
            <div className="absolute top-16 md:top-16 left-2 md:left-4 flex flex-col gap-1 bg-black/60 backdrop-blur-sm p-1 md:p-1.5 rounded-lg">
                <Button
                    size="icon"
                    variant={drawingMode === 'none' ? 'default' : 'ghost'}
                    onClick={() => setDrawingMode('none')}
                    title="Pan/Select"
                    className="h-7 w-7 md:h-8 md:w-8"
                >
                    <MousePointer2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <Button
                    size="icon"
                    variant={drawingMode === 'rectangle' ? 'default' : 'ghost'}
                    onClick={() => setDrawingMode('rectangle')}
                    title="Draw Rectangle"
                    className="h-7 w-7 md:h-8 md:w-8"
                >
                    <Square className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <Button
                    size="icon"
                    variant={drawingMode === 'circle' ? 'default' : 'ghost'}
                    onClick={() => setDrawingMode('circle')}
                    title="Draw Circle"
                    className="h-7 w-7 md:h-8 md:w-8"
                >
                    <Circle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
            </div>

            {/* Zoom/Rotation Controls - Responsive */}
            <div className="absolute bottom-16 md:bottom-4 right-2 md:right-4 flex gap-0.5 md:gap-1 bg-black/60 backdrop-blur-sm p-1 md:p-1.5 rounded-lg">
                <Button size="icon" variant="ghost" onClick={() => setRotationAngle(rotationAngle - 1)} className="h-7 w-7 md:h-8 md:w-8">
                    <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <span className="hidden md:flex items-center text-xs w-10 justify-center">{rotationAngle}°</span>
                <Button size="icon" variant="ghost" onClick={() => setRotationAngle(rotationAngle + 1)} className="h-7 w-7 md:h-8 md:w-8">
                    <RotateCw className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <div className="w-px bg-muted-foreground/30 mx-0.5 md:mx-1" />
                <Button size="icon" variant="ghost" onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))} className="h-7 w-7 md:h-8 md:w-8">
                    <ZoomOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <span className="hidden md:flex items-center text-xs w-12 justify-center">{Math.round(zoomLevel * 100)}%</span>
                <Button size="icon" variant="ghost" onClick={() => setZoomLevel(Math.min(10, zoomLevel + 0.1))} className="h-7 w-7 md:h-8 md:w-8">
                    <ZoomIn className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setZoomLevel(1); setOffset({ x: 0, y: 0 }); setRotationAngle(0) }} className="h-7 w-7 md:h-8 md:w-8">
                    <Maximize className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
            </div>
        </div>
    )
}
