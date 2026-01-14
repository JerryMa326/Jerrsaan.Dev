import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Trash2, ArrowUpDown, ArrowDown, ArrowUp, ArrowRight, ArrowLeft } from 'lucide-react'
import { rgbToCmyk } from '@/lib/imageUtils'

type SortDirection = 'top-to-bottom' | 'left-to-right'
type SortOrder = 'ascending' | 'descending'

export function ShapesList() {
    const {
        shapes, currentImageIndex, removeShape, updateShape, colorMode,
        selectedShapeId, setSelectedShapeId, setShapes
    } = useApp()

    const [showQuickSort, setShowQuickSort] = useState(false)
    const [sortDirection, setSortDirection] = useState<SortDirection>('top-to-bottom')
    const [sortOrder, setSortOrder] = useState<SortOrder>('ascending')

    const currentShapes = shapes.filter(s => s.imageIndex === currentImageIndex)

    const formatColor = (rgb: [number, number, number]) => {
        if (colorMode === 'RGB') {
            return `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
        } else {
            const cmyk = rgbToCmyk(rgb)
            return `C${(cmyk[0] * 100).toFixed(0)} M${(cmyk[1] * 100).toFixed(0)} Y${(cmyk[2] * 100).toFixed(0)} K${(cmyk[3] * 100).toFixed(0)}`
        }
    }

    const handleQuickSort = () => {
        const labels = 'abcdefghijklmnopqrstuvwxyz'
        const sorted = [...currentShapes].sort((a, b) => {
            const posA = sortDirection === 'top-to-bottom' ? a.y : a.x
            const posB = sortDirection === 'top-to-bottom' ? b.y : b.x
            return sortOrder === 'ascending' ? posA - posB : posB - posA
        })

        const updates: { id: string; label: string }[] = sorted.map((shape, idx) => ({
            id: shape.id,
            label: labels[idx] || `${idx + 1}`
        }))

        setShapes(prev => prev.map(s => {
            const update = updates.find(u => u.id === s.id)
            return update ? { ...s, label: update.label } : s
        }))

        setShowQuickSort(false)
    }

    if (currentShapes.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm">
                No shapes detected. Draw shapes or use auto-detection.
            </div>
        )
    }

    return (
        <div className="space-y-2 p-2">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">
                    Detected Shapes ({currentShapes.length})
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowQuickSort(!showQuickSort)}
                >
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Sort
                </Button>
            </div>

            {showQuickSort && (
                <div className="p-2 bg-muted/50 rounded-md space-y-2 mb-2">
                    <div className="text-xs font-medium">Quick Sort Labels</div>
                    <div className="flex gap-1">
                        <Button
                            size="sm"
                            variant={sortDirection === 'top-to-bottom' ? 'default' : 'outline'}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setSortDirection('top-to-bottom')}
                        >
                            {sortOrder === 'ascending' ? <ArrowDown className="h-3 w-3 mr-1" /> : <ArrowUp className="h-3 w-3 mr-1" />}
                            Vertical
                        </Button>
                        <Button
                            size="sm"
                            variant={sortDirection === 'left-to-right' ? 'default' : 'outline'}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setSortDirection('left-to-right')}
                        >
                            {sortOrder === 'ascending' ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}
                            Horizontal
                        </Button>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            size="sm"
                            variant={sortOrder === 'ascending' ? 'default' : 'outline'}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setSortOrder('ascending')}
                        >
                            Ascending
                        </Button>
                        <Button
                            size="sm"
                            variant={sortOrder === 'descending' ? 'default' : 'outline'}
                            className="flex-1 h-7 text-xs"
                            onClick={() => setSortOrder('descending')}
                        >
                            Descending
                        </Button>
                    </div>
                    <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={handleQuickSort}
                    >
                        Apply Sort
                    </Button>
                </div>
            )}

            {currentShapes.map(shape => (
                <div
                    key={shape.id}
                    className={`flex items-center gap-2 p-2 rounded-md text-xs cursor-pointer transition-colors ${selectedShapeId === shape.id
                            ? 'bg-primary/20 ring-1 ring-primary'
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                    onClick={() => setSelectedShapeId(selectedShapeId === shape.id ? null : shape.id)}
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
                            onClick={(e) => e.stopPropagation()}
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
                        onClick={(e) => {
                            e.stopPropagation()
                            removeShape(shape.id)
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}
        </div>
    )
}
