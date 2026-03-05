import { useApp } from '@/context/AppContext'
import { rgbToCmyk, rgbToHsl, rgbToHsv } from '@/lib/imageUtils'
import { calibrateColor } from '@/lib/colorCalibration'

export function ColorAnalysisPanel() {
    const { shapes, currentImageIndex, colorMode, rawRgbMode, colorCalibration } = useApp()

    const currentShapes = shapes.filter(s => s.imageIndex === currentImageIndex)

    const getColor = (rgb: [number, number, number]) =>
        rawRgbMode ? rgb : calibrateColor(rgb, colorCalibration)

    const formatColor = (rgb: [number, number, number]) => {
        const c = getColor(rgb)
        switch (colorMode) {
            case 'RGB': return `R:${c[0]} G:${c[1]} B:${c[2]}`
            case 'CMYK': {
                const cmyk = rgbToCmyk(c)
                return `C:${(cmyk[0] * 100).toFixed(0)} M:${(cmyk[1] * 100).toFixed(0)} Y:${(cmyk[2] * 100).toFixed(0)} K:${(cmyk[3] * 100).toFixed(0)}`
            }
            case 'HSL': {
                const hsl = rgbToHsl(c)
                return `H:${hsl[0]} S:${hsl[1]}% L:${hsl[2]}%`
            }
            case 'HSV': {
                const hsv = rgbToHsv(c)
                return `H:${hsv[0]} S:${hsv[1]}% V:${hsv[2]}%`
            }
        }
    }

    if (currentShapes.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                No color data available. Detect shapes to analyze colors.
            </div>
        )
    }

    const avgColor = currentShapes.reduce(
        (acc, s) => {
            const c = getColor(s.color)
            return [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]]
        },
        [0, 0, 0]
    ).map((v: number) => Math.round(v / currentShapes.length)) as [number, number, number]

    const totalMagnitude = currentShapes.map(s => {
        const c = getColor(s.color)
        return Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2)
    })
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
                        <div>Avg: {formatColor(avgColor)}</div>
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <h4 className="text-xs font-medium text-muted-foreground">Individual Values</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {currentShapes.map(shape => {
                        const c = getColor(shape.color)
                        return (
                            <div key={shape.id} className="flex items-center gap-2 p-1.5 bg-muted/20 rounded text-xs">
                                <div
                                    className="w-4 h-4 rounded flex-shrink-0"
                                    style={{ backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}
                                />
                                <span className="font-mono font-bold w-6">{shape.label}</span>
                                <div className="flex-1 font-mono text-muted-foreground">
                                    {formatColor(shape.color)}
                                    {shape.colorStdDev && (
                                        <span className="text-muted-foreground/50 ml-1">
                                            &plusmn;{shape.colorStdDev[0]}
                                        </span>
                                    )}
                                </div>
                                <span className="text-muted-foreground">
                                    &Sigma;{Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2).toFixed(0)}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
