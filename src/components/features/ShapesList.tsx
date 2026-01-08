import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { rgbToCmyk } from '@/lib/imageUtils'

export function ShapesList() {
    const { shapes, currentImageIndex, removeShape, updateShape, colorMode } = useApp()

    const currentShapes = shapes.filter(s => s.imageIndex === currentImageIndex)

    if (currentShapes.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                No shapes detected. Draw shapes or use auto-detection.
            </div>
        )
    }

    const formatColor = (rgb: [number, number, number]) => {
        if (colorMode === 'RGB') {
            return `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
        } else {
            const cmyk = rgbToCmyk(rgb)
            return `C${(cmyk[0] * 100).toFixed(0)} M${(cmyk[1] * 100).toFixed(0)} Y${(cmyk[2] * 100).toFixed(0)} K${(cmyk[3] * 100).toFixed(0)}`
        }
    }

    return (
        <div className="space-y-2 p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
                Detected Shapes ({currentShapes.length})
            </div>
            {currentShapes.map(shape => (
                <div
                    key={shape.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-xs"
                >
                    <div
                        className="w-6 h-6 rounded border flex-shrink-0"
                        style={{ backgroundColor: `rgb(${shape.color[0]}, ${shape.color[1]}, ${shape.color[2]})` }}
                    />
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            value={shape.label}
                            onChange={(e) => updateShape(shape.id, { label: e.target.value })}
                            className="w-10 bg-transparent border-b border-transparent hover:border-muted-foreground focus:border-primary outline-none font-mono font-bold"
                        />
                        <div className="text-muted-foreground truncate">
                            {formatColor(shape.color)}
                        </div>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeShape(shape.id)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}
        </div>
    )
}
