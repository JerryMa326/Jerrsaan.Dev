import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
    X, ChevronRight, ChevronLeft, Upload, Circle, Wand2,
    MousePointer2, FlaskConical, Calculator, CheckCircle2,
    Undo2, Pipette, FileSpreadsheet, PlayCircle
} from 'lucide-react'

interface TutorialStep {
    title: string
    description: string
    icon: React.ReactNode
    highlight?: string
    action?: string
}

const steps: TutorialStep[] = [
    {
        title: 'Welcome to ChemClub Analyst',
        description: 'This guide walks you through the full workflow: loading images, detecting wells, and building regression models to predict unknown concentrations.',
        icon: <FlaskConical className="h-8 w-8 text-primary" />,
    },
    {
        title: 'Load Your Images',
        description: 'Click the + button in the left sidebar, use the Load button in the header, or simply drag and drop image files anywhere on the window.',
        icon: <Upload className="h-6 w-6 text-blue-400" />,
        highlight: '[data-tutorial="load-images"]',
        action: 'Click + or drag images onto the window',
    },
    {
        title: 'Configure Detection',
        description: 'Open the Settings panel (gear icon) and choose Circle or Rectangle mode. For round wells, tune Min/Max Radius. Use the crosshair buttons to calibrate radius by drawing directly on the image.',
        icon: <Circle className="h-6 w-6 text-green-400" />,
        highlight: '[data-tutorial="detection-mode"]',
        action: 'Select Circle or Rectangle, adjust radius range',
    },
    {
        title: 'Auto-Detect Shapes',
        description: 'Click "Auto" to detect wells on the current image. Click "All" to batch-detect across every loaded image at once. Adjust parameters and re-run if needed.',
        icon: <Wand2 className="h-6 w-6 text-purple-400" />,
        highlight: '[data-tutorial="autodetect"]',
        action: 'Click the wand (Auto) button in the toolbar',
    },
    {
        title: 'Draw & Edit Shapes',
        description: 'Select the Circle or Rectangle tool from the left toolbar to manually draw shapes. Switch to the pointer tool to drag shapes to reposition them, or drag edges/corners to resize. Colors are re-extracted automatically after each move.',
        icon: <MousePointer2 className="h-6 w-6 text-yellow-400" />,
        action: 'Use pointer tool to drag and resize shapes',
    },
    {
        title: 'Undo & Redo',
        description: 'Made a mistake? Press Cmd+Z (Ctrl+Z on Windows) to undo any shape operation. Press Cmd+Shift+Z to redo. The undo/redo buttons are also in the header toolbar.',
        icon: <Undo2 className="h-6 w-6 text-orange-400" />,
        action: 'Cmd+Z to undo, Cmd+Shift+Z to redo',
    },
    {
        title: 'Color Calibration (Optional)',
        description: 'In Settings, scroll to Color Calibration. Pick a white reference and a black reference from your image. Switch from "Raw RGB" to "Calibrated RGB" to see normalized color values across different lighting conditions.',
        icon: <Pipette className="h-6 w-6 text-emerald-400" />,
        action: 'Pick white and black references in Settings',
    },
    {
        title: 'Regression Studio',
        description: 'Click the "Regression" tab to open the studio. You\'ll see a table of all detected shapes with their color values.',
        icon: <Calculator className="h-6 w-6 text-orange-400" />,
        highlight: '[data-tutorial="regression-tab"]',
        action: 'Click the Regression tab in the header',
    },
    {
        title: 'Enter Concentrations',
        description: 'In the data table, type known concentrations into the "Conc." column next to each standard sample. You need at least 2 data points to run a regression.',
        icon: <FlaskConical className="h-6 w-6 text-blue-400" />,
        action: 'Type concentration values in the table',
    },
    {
        title: 'Run Regression',
        description: 'Choose a model type (Linear, Quadratic, Power, Logarithmic, or Best Fit), then click "Run Regression". The studio shows equations, R² values, and fitted curves for each color channel. Use the Overlay toggle to compare all channels on one chart.',
        icon: <Calculator className="h-6 w-6 text-green-400" />,
        action: 'Select model type and click Run Regression',
    },
    {
        title: 'Predict & Export',
        description: 'The "Pred." column automatically shows predicted concentrations for all samples based on the regression model. Export your data as CSV for spreadsheets or JSON to save/reload your full model later.',
        icon: <FileSpreadsheet className="h-6 w-6 text-cyan-400" />,
        action: 'Check predictions, then export CSV or JSON',
    },
    {
        title: 'Batch Detection',
        description: 'Load multiple images and click the "All" button to auto-detect shapes on every image in one pass. Progress is shown via toast notifications.',
        icon: <PlayCircle className="h-6 w-6 text-indigo-400" />,
        action: 'Load multiple images, then click All',
    },
    {
        title: 'You\'re Ready!',
        description: 'That covers the full workflow. A few extra tips:\n\n- Use ROI crop (scissors icon) to limit detection to a specific region\n- Adjust preprocessing (brightness, contrast, CLAHE) for difficult images\n- Switch color modes (RGB/CMYK/HSL/HSV) in Settings\n- Your work is auto-saved to browser cache',
        icon: <CheckCircle2 className="h-8 w-8 text-green-400" />,
    },
]

interface TutorialProps {
    isOpen: boolean
    onClose: () => void
}

export function Tutorial({ isOpen, onClose }: TutorialProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

    const step = steps[currentStep]
    const isFirst = currentStep === 0
    const isLast = currentStep === steps.length - 1

    useEffect(() => {
        if (!isOpen) {
            setCurrentStep(0)
            return
        }
    }, [isOpen])

    // Update highlight position
    useEffect(() => {
        if (!isOpen || !step.highlight) {
            setHighlightRect(null)
            return
        }

        const update = () => {
            const el = document.querySelector(step.highlight!)
            setHighlightRect(el ? el.getBoundingClientRect() : null)
        }

        // Small delay so DOM settles after tab switches etc.
        const timer = setTimeout(update, 100)
        window.addEventListener('resize', update)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', update)
        }
    }, [isOpen, step.highlight, currentStep])

    const handleNext = useCallback(() => {
        if (isLast) {
            onClose()
        } else {
            setCurrentStep(s => s + 1)
        }
    }, [isLast, onClose])

    const handlePrev = useCallback(() => {
        if (!isFirst) setCurrentStep(s => s - 1)
    }, [isFirst])

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            else if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
            else if (e.key === 'ArrowLeft') handlePrev()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, handleNext, handlePrev, onClose])

    if (!isOpen) return null

    // Compute modal position to avoid overlapping highlighted element
    const getModalStyle = (): React.CSSProperties => {
        if (!highlightRect) {
            // Center
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }

        const pad = 16
        const modalWidth = 420
        const modalHeight = 300 // approximate
        const vw = window.innerWidth
        const vh = window.innerHeight

        // Prefer placing below the highlight
        if (highlightRect.bottom + pad + modalHeight < vh) {
            return {
                top: highlightRect.bottom + pad,
                left: Math.min(Math.max(pad, highlightRect.left), vw - modalWidth - pad),
            }
        }
        // Above
        if (highlightRect.top - pad - modalHeight > 0) {
            return {
                top: highlightRect.top - pad - modalHeight,
                left: Math.min(Math.max(pad, highlightRect.left), vw - modalWidth - pad),
            }
        }
        // Right
        if (highlightRect.right + pad + modalWidth < vw) {
            return {
                top: Math.max(pad, highlightRect.top),
                left: highlightRect.right + pad,
            }
        }
        // Left
        return {
            top: Math.max(pad, highlightRect.top),
            left: Math.max(pad, highlightRect.left - pad - modalWidth),
        }
    }

    return (
        <div className="fixed inset-0 z-[10000]">
            {/* Overlay with cutout */}
            {highlightRect ? (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ pointerEvents: 'auto' }}>
                    <defs>
                        <mask id="tutorial-mask">
                            <rect width="100%" height="100%" fill="white" />
                            <rect
                                x={highlightRect.left - 6}
                                y={highlightRect.top - 6}
                                width={highlightRect.width + 12}
                                height={highlightRect.height + 12}
                                rx="8"
                                fill="black"
                            />
                        </mask>
                    </defs>
                    <rect
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.65)"
                        mask="url(#tutorial-mask)"
                    />
                    {/* Highlight ring */}
                    <rect
                        x={highlightRect.left - 6}
                        y={highlightRect.top - 6}
                        width={highlightRect.width + 12}
                        height={highlightRect.height + 12}
                        rx="8"
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        className="animate-pulse"
                    />
                </svg>
            ) : (
                <div className="absolute inset-0 bg-black/65" />
            )}

            {/* Modal */}
            <div className="absolute max-w-[420px] w-[calc(100%-2rem)] mx-4" style={getModalStyle()}>
                <div className="bg-card border rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0">{step.icon}</div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-base leading-tight truncate">{step.title}</h3>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {currentStep + 1} / {steps.length}
                                </p>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 shrink-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                            {step.description}
                        </p>

                        {step.action && (
                            <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-lg">
                                <ChevronRight className="h-4 w-4 shrink-0" />
                                <span className="font-medium">{step.action}</span>
                            </div>
                        )}

                        {/* Progress bar */}
                        <div className="pt-1">
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                        <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground text-xs">
                            Skip
                        </Button>
                        <div className="flex gap-2">
                            {!isFirst && (
                                <Button variant="outline" size="sm" onClick={handlePrev}>
                                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                                    Back
                                </Button>
                            )}
                            <Button size="sm" onClick={handleNext}>
                                {isLast ? 'Done' : 'Next'}
                                {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
