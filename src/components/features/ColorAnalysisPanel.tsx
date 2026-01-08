import { useApp } from '@/context/AppContext'
import { rgbToCmyk } from '@/lib/imageUtils'

export function ColorAnalysisPanel() {
    const { shapes, currentImageIndex, colorMode } = useApp()

    const currentShapes = shapes.filter(s => s.imageIndex === currentImageIndex)

    if (currentShapes.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                No color data available. Detect shapes to analyze colors.
            </div>
        )
    }

    // Calculate statistics
    const avgColor = currentShapes.reduce(
        (acc, s) => [acc[0] + s.color[0], acc[1] + s.color[1], acc[2] + s.color[2]],
        [0, 0, 0]
    ).map((v: number) => Math.round(v / currentShapes.length)) as [number, number, number]

    const totalMagnitude = currentShapes.map(s =>
        Math.sqrt(s.color[0] ** 2 + s.color[1] ** 2 + s.color[2] ** 2)
    )
    const avgMagnitude = totalMagnitude.reduce((a, b) => a + b, 0) / totalMagnitude.length

    return (
        <div className="p-3 space-y-4 text-sm">
            <div className="bg-muted/30 rounded-md p-3 space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Summary Statistics</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <span className="text-muted-foreground">Samples:</span>
                        <span className="ml-2 font-mono">{currentShapes.length}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Avg Magnitude:</span>
                        <span className="ml-2 font-mono">{avgMagnitude.toFixed(1)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: `rgb(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]})` }}
                    />
                    <div className="text-xs">
                        <div>Avg RGB: {avgColor.join(', ')}</div>
                        {colorMode === 'CMYK' && (
                            <div className="text-muted-foreground">
                                CMYK: {rgbToCmyk(avgColor).map(v => (v * 100).toFixed(0)).join(', ')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <h4 className="text-xs font-medium text-muted-foreground">Individual Values</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {currentShapes.map(shape => {
                        const cmyk = rgbToCmyk(shape.color)
                        return (
                            <div key={shape.id} className="flex items-center gap-2 p-1.5 bg-muted/20 rounded text-xs">
                                <div
                                    className="w-4 h-4 rounded flex-shrink-0"
                                    style={{ backgroundColor: `rgb(${shape.color[0]}, ${shape.color[1]}, ${shape.color[2]})` }}
                                />
                                <span className="font-mono font-bold w-6">{shape.label}</span>
                                <div className="flex-1 font-mono text-muted-foreground">
                                    {colorMode === 'RGB'
                                        ? `R:${shape.color[0]} G:${shape.color[1]} B:${shape.color[2]}`
                                        : `C:${(cmyk[0] * 100).toFixed(0)} M:${(cmyk[1] * 100).toFixed(0)} Y:${(cmyk[2] * 100).toFixed(0)} K:${(cmyk[3] * 100).toFixed(0)}`
                                    }
                                </div>
                                <span className="text-muted-foreground">
                                    Σ{Math.sqrt(shape.color[0] ** 2 + shape.color[1] ** 2 + shape.color[2] ** 2).toFixed(0)}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
