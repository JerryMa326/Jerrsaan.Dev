import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Upload, Circle, Wand2, Trash2, Edit3, FlaskConical, Calculator, CheckCircle2 } from 'lucide-react'

interface TutorialStep {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    highlight?: string // CSS selector for element to highlight
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    action?: string // Optional action hint
}

const tutorialSteps: TutorialStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to ChemClub Analyst',
        description: 'This tutorial covers the workflow for analyzing colorimetric assay images and building regression models. Click Next to continue.',
        icon: <FlaskConical className="h-8 w-8 text-primary" />,
        position: 'center'
    },
    {
        id: 'load-image',
        title: '1. Load Your Images',
        description: 'Click the "Load Images" button in the left sidebar or drag & drop your well plate images. You can load multiple images at once for batch analysis.',
        icon: <Upload className="h-6 w-6 text-blue-400" />,
        highlight: '[data-tutorial="load-images"]',
        position: 'top-left',
        action: 'Click the folder icon in the left sidebar'
    },
    {
        id: 'select-mode',
        title: '2. Choose Detection Mode',
        description: 'In the Settings panel (right side), select Circle mode for round wells or Rectangle mode for square wells. Circle mode uses Hough Circle detection, suitable for most 96-well plates.',
        icon: <Circle className="h-6 w-6 text-green-400" />,
        highlight: '[data-tutorial="detection-mode"]',
        position: 'top-right',
        action: 'Select Circle or Rectangle in Detection Settings'
    },
    {
        id: 'calibrate-radius',
        title: '3. Calibrate Radius (Optional)',
        description: 'Click the crosshair button next to the Min/Max Radius sliders, then draw a circle on your smallest and largest wells to set the detection range.',
        icon: <Circle className="h-6 w-6 text-cyan-400" />,
        position: 'top-right',
        action: 'Use crosshair buttons to calibrate'
    },
    {
        id: 'autodetect',
        title: '4. Run Auto-Detection',
        description: 'Click the wand button in the top toolbar to detect all wells in your image. Tweak the detection parameters in Settings if needed.',
        icon: <Wand2 className="h-6 w-6 text-purple-400" />,
        highlight: '[data-tutorial="autodetect"]',
        position: 'top-left',
        action: 'Click the wand icon in the top toolbar'
    },
    {
        id: 'manual-draw',
        title: '5. Manual Adjustments',
        description: 'You can manually draw circles/rectangles to add missed wells. Use the Pan tool (hand icon) to navigate, or hold Spacebar while dragging.',
        icon: <Circle className="h-6 w-6 text-green-400" />,
        position: 'top-left',
        action: 'Select Circle tool and draw on the image'
    },
    {
        id: 'delete-shapes',
        title: '6. Delete Unwanted Shapes',
        description: 'Click on a shape in the Shapes panel (right side) to select it, then click the trash icon to delete false detections. Or right-click shapes on the canvas.',
        icon: <Trash2 className="h-6 w-6 text-red-400" />,
        position: 'bottom-right',
        action: 'Click on shapes in the list to select, then delete'
    },
    {
        id: 'rename-labels',
        title: '7. Rename Labels',
        description: 'Click on a label in the Shapes panel to edit it. Labels are assigned sequentially across all images (a, b, c... then Greek, then Arabic letters).',
        icon: <Edit3 className="h-6 w-6 text-yellow-400" />,
        position: 'bottom-right',
        action: 'Click on a shape label to rename it'
    },
    {
        id: 'regression-tab',
        title: '8. Go to Regression Studio',
        description: 'Click the "Regression" tab in the header to switch to the Regression Studio where you\'ll enter known concentrations and build calibration curves.',
        icon: <Calculator className="h-6 w-6 text-orange-400" />,
        highlight: '[data-tutorial="regression-tab"]',
        position: 'top-left',
        action: 'Click the Regression tab'
    },
    {
        id: 'add-molarities',
        title: '9. Enter Known Concentrations',
        description: 'In Regression Studio, use the "Commit with Molarity" button to assign known concentrations (molarities) to your standard wells. These become your calibration points.',
        icon: <FlaskConical className="h-6 w-6 text-blue-400" />,
        position: 'center',
        action: 'Select shapes and enter their known concentrations'
    },
    {
        id: 'build-model',
        title: '10. Build Regression Model',
        description: 'Once you have enough calibration points, click "Build Model" to create a regression curve. Choose between Linear, Polynomial, or Logarithmic regression types.',
        icon: <Calculator className="h-6 w-6 text-green-400" />,
        position: 'center',
        action: 'Click Build Model after committing calibration points'
    },
    {
        id: 'predict',
        title: '11. Predict Unknown Concentrations',
        description: 'Use your regression model to predict concentrations of unknown samples based on their color values. Results can be exported for further analysis.',
        icon: <Wand2 className="h-6 w-6 text-purple-400" />,
        position: 'center'
    },
    {
        id: 'complete',
        title: 'Tutorial Complete',
        description: 'You are ready to start analyzing. You can restart this tutorial from the help button at any time.\n\nTips:\n- Use ROI crop to focus on specific plate regions\n- Adjust preprocessing for difficult images\n- Labels are shared across all images',
        icon: <CheckCircle2 className="h-8 w-8 text-green-400" />,
        position: 'center'
    }
]

interface TutorialProps {
    isOpen: boolean
    onClose: () => void
}

export function Tutorial({ isOpen, onClose }: TutorialProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

    const step = tutorialSteps[currentStep]
    const isFirst = currentStep === 0
    const isLast = currentStep === tutorialSteps.length - 1

    // Update highlight position when step changes
    useEffect(() => {
        if (!isOpen || !step.highlight) {
            setHighlightRect(null)
            return
        }

        const updateHighlight = () => {
            const element = document.querySelector(step.highlight!)
            if (element) {
                setHighlightRect(element.getBoundingClientRect())
            } else {
                setHighlightRect(null)
            }
        }

        updateHighlight()
        window.addEventListener('resize', updateHighlight)
        return () => window.removeEventListener('resize', updateHighlight)
    }, [isOpen, step.highlight, currentStep])

    if (!isOpen) return null

    const handleNext = () => {
        if (isLast) {
            onClose()
            setCurrentStep(0)
        } else {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (!isFirst) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const handleSkip = () => {
        onClose()
        setCurrentStep(0)
    }

    // Position classes for the modal
    const positionClasses = {
        'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'top-left': 'top-20 left-20',
        'top-right': 'top-20 right-20',
        'bottom-left': 'bottom-20 left-20',
        'bottom-right': 'bottom-20 right-20'
    }

    return (
        <div className="fixed inset-0 z-[10000]">
            {/* Semi-transparent overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Highlight cutout */}
            {highlightRect && (
                <div
                    className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none animate-pulse"
                    style={{
                        top: highlightRect.top - 4,
                        left: highlightRect.left - 4,
                        width: highlightRect.width + 8,
                        height: highlightRect.height + 8
                    }}
                />
            )}

            {/* Tutorial modal */}
            <div className={`absolute ${positionClasses[step.position]} max-w-md w-full mx-4`}>
                <div className="bg-card border rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                        <div className="flex items-center gap-3">
                            {step.icon}
                            <div>
                                <h3 className="font-semibold text-lg">{step.title}</h3>
                                <p className="text-xs text-muted-foreground">
                                    Step {currentStep + 1} of {tutorialSteps.length}
                                </p>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={handleSkip} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {step.description}
                        </p>

                        {step.action && (
                            <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary p-3 rounded-lg">
                                <ChevronRight className="h-4 w-4 shrink-0" />
                                <span className="font-medium">{step.action}</span>
                            </div>
                        )}

                        {/* Progress dots */}
                        <div className="flex justify-center gap-1 pt-2">
                            {tutorialSteps.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentStep(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentStep
                                        ? 'bg-primary w-4'
                                        : idx < currentStep
                                            ? 'bg-primary/50'
                                            : 'bg-muted-foreground/30'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="text-muted-foreground"
                        >
                            Skip Tutorial
                        </Button>
                        <div className="flex gap-2">
                            {!isFirst && (
                                <Button variant="outline" onClick={handlePrev}>
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Back
                                </Button>
                            )}
                            <Button onClick={handleNext}>
                                {isLast ? 'Finish' : 'Next'}
                                {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
