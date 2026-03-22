import { useState, useRef, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Scatter } from 'react-chartjs-2'
import { rgbToCmyk } from '@/lib/imageUtils'
import { calibrateColor } from '@/lib/colorCalibration'
import { Download, Upload, FileSpreadsheet, Layers, ImageDown, ClipboardCopy } from 'lucide-react'
import {
    fitLinear, fitQuadratic, fitPower, fitLogarithmic, fitBest,
    evaluateModel, predict as predictFromModel, formatEquation,
    type RegressionModel, type RegressionModelType
} from '@/lib/regressionUtils'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ScatterController,
    type ChartDataset,
    type TooltipItem,
    type Plugin
} from 'chart.js'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ScatterController
)

type ColorChannel = 'red' | 'green' | 'blue' | 'cyan' | 'magenta' | 'yellow' | 'black' | 'magnitude'

interface ExportedModel {
    version: string
    exportDate: string
    committedPoints: { label: string; y: number }[]
    shapeData: { label: string; color: [number, number, number] }[]
    regressionModels: Record<string, RegressionModel>
    modelType?: RegressionModelType | 'best'
}

export function RegressionStudio() {
    const { shapes, committedPoints, setCommittedPoints, regressionModels, setRegressionModels, colorCalibration, rawRgbMode } = useApp()
    const { toast } = useToast()
    const [activeCharts, setActiveCharts] = useState<ColorChannel[]>(['red', 'green', 'blue'])
    const [selectedPoint, setSelectedPoint] = useState<{ label: string; color: [number, number, number] } | null>(null)
    const [modelType, setModelType] = useState<RegressionModelType | 'best'>('linear')
    const [overlayMode, setOverlayMode] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const chartsContainerRef = useRef<HTMLDivElement>(null)

    const getDisplayColor = (color: [number, number, number]): [number, number, number] => {
        if (rawRgbMode) return color
        return calibrateColor(color, colorCalibration)
    }

    const handleConcentrationChange = (label: string, value: string) => {
        if (value === '') {
            setCommittedPoints(prev => prev.filter(p => p.label !== label))
            return
        }
        const num = parseFloat(value)
        if (isNaN(num)) return

        setCommittedPoints(prev => {
            const existing = prev.find(p => p.label === label)
            if (existing) {
                return prev.map(p => p.label === label ? { ...p, y: num } : p)
            } else {
                return [...prev, { label, y: num }]
            }
        })
    }

    const getColorValue = (color: [number, number, number], channel: ColorChannel): number => {
        const c = getDisplayColor(color)
        const cmyk = rgbToCmyk(c)
        switch (channel) {
            case 'red': return c[0]
            case 'green': return c[1]
            case 'blue': return c[2]
            case 'cyan': return cmyk[0] * 100
            case 'magenta': return cmyk[1] * 100
            case 'yellow': return cmyk[2] * 100
            case 'black': return cmyk[3] * 100
            case 'magnitude': return Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2)
            default: return 0
        }
    }

    const runRegression = () => {
        const points = committedPoints.map(pt => {
            const shape = shapes.find(s => s.label === pt.label)
            if (!shape) return null
            return { concentration: pt.y, color: shape.color, label: pt.label }
        }).filter(Boolean) as { concentration: number; color: [number, number, number]; label: string }[]

        if (points.length < 2) {
            toast('Need at least 2 data points with known concentrations', 'error')
            return
        }

        const channels: ColorChannel[] = ['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'black', 'magnitude']
        const newModels: Record<string, RegressionModel> = {}

        channels.forEach(channel => {
            const xs = points.map(pt => pt.concentration)
            const ys = points.map(pt => getColorValue(pt.color, channel))

            let model: RegressionModel | null = null
            switch (modelType) {
                case 'linear': model = fitLinear(xs, ys); break
                case 'quadratic': model = fitQuadratic(xs, ys); break
                case 'power': model = fitPower(xs, ys); break
                case 'logarithmic': model = fitLogarithmic(xs, ys); break
                case 'best': model = fitBest(xs, ys); break
            }

            if (model) newModels[channel] = model
        })

        setRegressionModels(newModels)
        toast('Regression complete', 'success')
    }

    const exportModel = () => {
        const exportData: ExportedModel = {
            version: '4.0',
            exportDate: new Date().toISOString(),
            committedPoints: committedPoints,
            shapeData: shapes.map(s => ({ label: s.label, color: s.color })),
            regressionModels: regressionModels,
            modelType
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chemclub-model-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const exportCSV = () => {
        const headers = ['Label', 'R', 'G', 'B', 'C', 'M', 'Y', 'K', 'Magnitude', 'Concentration', 'Predicted']
        const rows = shapes.map(shape => {
            const c = getDisplayColor(shape.color)
            const cmyk = rgbToCmyk(c)
            const mag = Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2)
            const committed = committedPoints.find(p => p.label === shape.label)
            const model = regressionModels.magnitude
            const predicted = model ? predictFromModel(model, mag) : null
            return [
                shape.label,
                c[0], c[1], c[2],
                (cmyk[0] * 100).toFixed(1), (cmyk[1] * 100).toFixed(1), (cmyk[2] * 100).toFixed(1), (cmyk[3] * 100).toFixed(1),
                mag.toFixed(2),
                committed?.y ?? '',
                predicted !== null && !isNaN(predicted) ? predicted.toFixed(3) : ''
            ].join(',')
        })

        const csv = [headers.join(','), ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chemclub-data-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const copyToClipboard = () => {
        const headers = ['Label', 'R', 'G', 'B', 'Concentration', 'Predicted']
        const rows = shapes.map(shape => {
            const c = getDisplayColor(shape.color)
            const committed = committedPoints.find(p => p.label === shape.label)
            const magnitude = Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2)
            const model = regressionModels.magnitude
            const predicted = model ? predictFromModel(model, magnitude) : null
            return [
                shape.label,
                c[0], c[1], c[2],
                committed?.y ?? '',
                predicted !== null && !isNaN(predicted) ? predicted.toFixed(3) : ''
            ].join('\t')
        })
        const text = [headers.join('\t'), ...rows].join('\n')
        navigator.clipboard.writeText(text).then(() => {
            toast('Data copied to clipboard', 'success')
        }).catch(() => {
            toast('Failed to copy to clipboard', 'error')
        })
    }

    const validateImportData = (data: unknown): { valid: boolean; error?: string; data?: ExportedModel } => {
        if (!data || typeof data !== 'object') return { valid: false, error: 'File does not contain a valid JSON object' }

        const d = data as Record<string, unknown>

        if (d.committedPoints !== undefined) {
            if (!Array.isArray(d.committedPoints)) return { valid: false, error: '"committedPoints" must be an array' }
            for (const pt of d.committedPoints) {
                if (typeof pt !== 'object' || pt === null) return { valid: false, error: 'Each committed point must be an object' }
                const p = pt as Record<string, unknown>
                if (typeof p.label !== 'string') return { valid: false, error: 'Each committed point must have a string "label"' }
                if (typeof p.y !== 'number' || isNaN(p.y as number)) return { valid: false, error: `Committed point "${p.label}" has an invalid concentration value` }
            }
        }

        if (d.regressionModels !== undefined) {
            if (typeof d.regressionModels !== 'object' || d.regressionModels === null || Array.isArray(d.regressionModels)) {
                return { valid: false, error: '"regressionModels" must be an object' }
            }
            const validTypes = ['linear', 'quadratic', 'power', 'logarithmic']
            for (const [key, model] of Object.entries(d.regressionModels as Record<string, unknown>)) {
                if (typeof model !== 'object' || model === null) return { valid: false, error: `Model "${key}" is not a valid object` }
                const m = model as Record<string, unknown>
                if ('type' in m && !validTypes.includes(m.type as string)) {
                    return { valid: false, error: `Model "${key}" has invalid type "${m.type}". Expected: ${validTypes.join(', ')}` }
                }
                if (typeof m.r2 !== 'number') return { valid: false, error: `Model "${key}" is missing a numeric "r2" field` }
            }
        }

        if (d.modelType !== undefined) {
            const validModelTypes = ['linear', 'quadratic', 'power', 'logarithmic', 'best']
            if (!validModelTypes.includes(d.modelType as string)) {
                return { valid: false, error: `Invalid modelType "${d.modelType}"` }
            }
        }

        return { valid: true, data: data as ExportedModel }
    }

    const importModel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const raw = JSON.parse(event.target?.result as string)
                const result = validateImportData(raw)

                if (!result.valid || !result.data) {
                    toast(`Import failed: ${result.error}`, 'error')
                    return
                }

                const data = result.data

                if (data.committedPoints) {
                    setCommittedPoints(data.committedPoints)
                }
                if (data.regressionModels) {
                    // Backward compat: old models without 'type' field => linear
                    const migrated: Record<string, RegressionModel> = {}
                    for (const [key, model] of Object.entries(data.regressionModels)) {
                        if (!('type' in model)) {
                            const legacy = model as unknown as { m: number; b: number; r2: number }
                            migrated[key] = { type: 'linear', m: legacy.m, b: legacy.b, r2: legacy.r2 }
                        } else {
                            migrated[key] = model
                        }
                    }
                    setRegressionModels(migrated)
                }
                if (data.modelType) {
                    setModelType(data.modelType)
                }

                toast(`Imported model from ${data.exportDate || 'unknown date'} with ${data.committedPoints?.length || 0} data points`, 'success')
            } catch {
                toast('Failed to import: file is not valid JSON', 'error')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const exportChartsPNG = useCallback(() => {
        const container = chartsContainerRef.current
        if (!container) return

        const canvases = container.querySelectorAll('canvas')
        if (canvases.length === 0) {
            toast('No charts to export', 'info')
            return
        }

        // Combine all chart canvases into a single image
        const padding = 16
        const cols = Math.min(canvases.length, overlayMode ? 1 : 2)
        const rows = Math.ceil(canvases.length / cols)
        const cellW = canvases[0].width
        const cellH = canvases[0].height
        const totalW = cols * cellW + (cols + 1) * padding
        const totalH = rows * cellH + (rows + 1) * padding + 40 // extra for title

        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = totalW
        exportCanvas.height = totalH
        const ctx = exportCanvas.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = '#0f0f0f'
        ctx.fillRect(0, 0, totalW, totalH)

        // Title
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 16px system-ui, sans-serif'
        ctx.fillText('ChemClub Analyst — Regression Charts', padding, 28)

        canvases.forEach((canvas, i) => {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = padding + col * (cellW + padding)
            const y = 40 + padding + row * (cellH + padding)
            ctx.drawImage(canvas, x, y)
        })

        const url = exportCanvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = `chemclub-charts-${new Date().toISOString().slice(0, 10)}.png`
        a.click()
        toast('Charts exported as PNG', 'success')
    }, [overlayMode, toast])

    const channelColors: Record<ColorChannel, string> = {
        red: '#ef4444',
        green: '#22c55e',
        blue: '#3b82f6',
        cyan: '#06b6d4',
        magenta: '#d946ef',
        yellow: '#eab308',
        black: '#71717a',
        magnitude: '#a855f7'
    }

    const toggleChart = (channel: ColorChannel) => {
        setActiveCharts(prev =>
            prev.includes(channel)
                ? prev.filter(c => c !== channel)
                : [...prev, channel]
        )
    }

    const createChartData = (channel: ColorChannel) => {
        const dataPoints = committedPoints.map(pt => {
            const shape = shapes.find(s => s.label === pt.label)
            if (!shape) return null
            return {
                x: pt.y,
                y: getColorValue(shape.color, channel),
                label: pt.label,
                color: shape.color,
                stdDev: shape.colorStdDev
            }
        }).filter(Boolean) as { x: number; y: number; label: string; color: [number, number, number]; stdDev?: [number, number, number] }[]

        const datasets: ChartDataset<'scatter'>[] = [{
            label: channel.charAt(0).toUpperCase() + channel.slice(1),
            data: dataPoints,
            borderColor: channelColors[channel],
            backgroundColor: channelColors[channel],
            pointRadius: 8,
            pointHoverRadius: 12,
            showLine: false
        }]

        const model = regressionModels[channel]
        if (model && dataPoints.length >= 2) {
            const xValues = dataPoints.map(p => p.x)
            const minX = Math.min(...xValues) * 0.9
            const maxX = Math.max(...xValues) * 1.1
            const numPoints = model.type === 'linear' ? 2 : 50
            const step = (maxX - minX) / (numPoints - 1)

            const curveData = []
            for (let i = 0; i < numPoints; i++) {
                const x = minX + step * i
                curveData.push({ x, y: evaluateModel(model, x) })
            }

            datasets.push({
                label: `R² = ${model.r2.toFixed(4)}`,
                data: curveData,
                borderColor: channelColors[channel],
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                pointRadius: 0,
                showLine: true,
                borderWidth: 2
            })
        }

        return { datasets }
    }

    const createOverlayChartData = () => {
        const datasets: ChartDataset<'scatter'>[] = []

        for (const channel of activeCharts) {
            const dataPoints = committedPoints.map(pt => {
                const shape = shapes.find(s => s.label === pt.label)
                if (!shape) return null
                return { x: pt.y, y: getColorValue(shape.color, channel) }
            }).filter(Boolean) as { x: number; y: number }[]

            datasets.push({
                label: channel.charAt(0).toUpperCase() + channel.slice(1),
                data: dataPoints,
                borderColor: channelColors[channel],
                backgroundColor: channelColors[channel],
                pointRadius: 6,
                showLine: false
            })

            const model = regressionModels[channel]
            if (model && dataPoints.length >= 2) {
                const xValues = dataPoints.map(p => p.x)
                const minX = Math.min(...xValues) * 0.9
                const maxX = Math.max(...xValues) * 1.1
                const numPoints = model.type === 'linear' ? 2 : 50
                const step = (maxX - minX) / (numPoints - 1)
                const curveData = []
                for (let i = 0; i < numPoints; i++) {
                    const x = minX + step * i
                    curveData.push({ x, y: evaluateModel(model, x) })
                }

                datasets.push({
                    label: `${channel} fit`,
                    data: curveData,
                    borderColor: channelColors[channel],
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    showLine: true,
                    borderWidth: 2
                })
            }
        }

        return { datasets }
    }

    // Error bars plugin
    const errorBarPlugin: Plugin<'scatter'> = {
        id: 'errorBars',
        afterDatasetsDraw(chart) {
            const ctx = chart.ctx
            const dataset = chart.data.datasets[0]
            if (!dataset) return

            const meta = chart.getDatasetMeta(0)
            const points = dataset.data as ({ x: number; y: number; stdDev?: [number, number, number] })[]
            points.forEach((point, i: number) => {
                if (!point.stdDev) return
                const { x } = meta.data[i].getProps(['x', 'y'])
                const channelIdx = activeCharts[0] === 'red' ? 0 : activeCharts[0] === 'green' ? 1 : 2
                const sd = point.stdDev[channelIdx] || 0
                if (sd <= 0) return

                const yScale = chart.scales.y
                const yTop = yScale.getPixelForValue(point.y + sd)
                const yBot = yScale.getPixelForValue(point.y - sd)

                ctx.save()
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'
                ctx.lineWidth = 1.5
                ctx.beginPath()
                ctx.moveTo(x, yTop)
                ctx.lineTo(x, yBot)
                // caps
                ctx.moveTo(x - 3, yTop)
                ctx.lineTo(x + 3, yTop)
                ctx.moveTo(x - 3, yBot)
                ctx.lineTo(x + 3, yBot)
                ctx.stroke()
                ctx.restore()
            })
        }
    }

    const chartOptions = (channel: ColorChannel) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: overlayMode },
            tooltip: {
                callbacks: {
                    label: (context: TooltipItem<'scatter'>) => {
                        const point = context.raw as { x: number; y: number; label?: string }
                        if (point.label) {
                            return [`Sample: ${point.label}`, `Conc: ${point.x}`, `Value: ${point.y.toFixed(2)}`]
                        }
                        return `${point.y.toFixed(2)}`
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'linear' as const,
                title: { display: true, text: 'Concentration (mM)', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                type: 'linear' as const,
                title: { display: true, text: overlayMode ? 'Value' : channel, font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.05)' }
            }
        }
    })

    if (shapes.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center text-muted-foreground max-w-xs mx-auto">
                    <p className="text-lg font-medium">No data available</p>
                    <p className="text-sm mt-2">Detect or draw shapes on images first, then return here for regression analysis.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="text-lg font-bold">Regression Studio</h2>
                <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-1" /> Import
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".json"
                        onChange={importModel}
                    />
                    <Button size="sm" variant="outline" onClick={exportModel} disabled={committedPoints.length === 0}>
                        <Download className="w-4 h-4 mr-1" /> JSON
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportCSV} disabled={shapes.length === 0}>
                        <FileSpreadsheet className="w-4 h-4 mr-1" /> CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={copyToClipboard} disabled={shapes.length === 0}>
                        <ClipboardCopy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportChartsPNG} disabled={activeCharts.length === 0 || committedPoints.length < 2}>
                        <ImageDown className="w-4 h-4 mr-1" /> PNG
                    </Button>
                    <Button size="sm" onClick={runRegression} disabled={committedPoints.length < 2}>
                        Run Regression
                    </Button>
                </div>
            </div>

            {/* Model Type Selector */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-card rounded-lg border">
                <span className="text-xs text-muted-foreground mr-2 self-center">Model:</span>
                {(['linear', 'quadratic', 'power', 'logarithmic', 'best'] as const).map(mt => (
                    <button
                        key={mt}
                        onClick={() => setModelType(mt)}
                        className={`px-2.5 py-1 text-xs rounded transition-all ${modelType === mt
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                            }`}
                    >
                        {mt === 'best' ? 'Best Fit' : mt.charAt(0).toUpperCase() + mt.slice(1)}
                    </button>
                ))}
            </div>

            {/* Channel Toggle + Overlay */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-card rounded-lg border items-center">
                <span className="text-xs text-muted-foreground mr-2 self-center">Charts:</span>
                {(['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'black', 'magnitude'] as ColorChannel[]).map(ch => (
                    <button
                        key={ch}
                        onClick={() => toggleChart(ch)}
                        className={`px-2 py-1 text-xs rounded transition-all ${activeCharts.includes(ch)
                            ? 'text-white shadow-sm'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                            }`}
                        style={{ backgroundColor: activeCharts.includes(ch) ? channelColors[ch] : undefined }}
                    >
                        {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                ))}
                <div className="w-px h-5 bg-muted-foreground/30 mx-1" />
                <button
                    onClick={() => setOverlayMode(!overlayMode)}
                    className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${overlayMode ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                    title="Overlay all channels on one chart"
                >
                    <Layers className="h-3 w-3" /> Overlay
                </button>
            </div>

            {/* Selected Point Info */}
            {selectedPoint && (
                <div className="flex items-center gap-3 p-2 bg-card rounded-lg border">
                    <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: `rgb(${selectedPoint.color.join(',')})` }}
                    />
                    <div className="text-sm">
                        <span className="font-bold">{selectedPoint.label}</span>
                        <span className="text-muted-foreground ml-2">
                            RGB({selectedPoint.color.join(', ')})
                        </span>
                    </div>
                    <button
                        onClick={() => setSelectedPoint(null)}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                    >&times;</button>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                {/* Data Table */}
                <div className="xl:col-span-1 border rounded-lg overflow-hidden bg-card">
                    <div className="p-2 bg-muted/50 border-b text-xs font-semibold">Data Points</div>
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/30 sticky top-0">
                                <tr>
                                    <th className="p-1.5 text-left">Label</th>
                                    <th className="p-1.5 text-left">RGB</th>
                                    <th className="p-1.5 text-left">Conc.</th>
                                    <th className="p-1.5 text-left">Pred.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shapes.map(shape => {
                                    const committed = committedPoints.find(p => p.label === shape.label)
                                    const c = getDisplayColor(shape.color)
                                    const magnitude = Math.sqrt(c[0] ** 2 + c[1] ** 2 + c[2] ** 2)
                                    const model = regressionModels.magnitude
                                    const predicted = model ? predictFromModel(model, magnitude) : null

                                    return (
                                        <tr key={shape.id} className="border-t border-muted hover:bg-muted/20">
                                            <td className="p-1.5">
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="w-3 h-3 rounded"
                                                        style={{ backgroundColor: `rgb(${c.join(',')})` }}
                                                    />
                                                    <span className="font-mono font-bold">{shape.label}</span>
                                                </div>
                                            </td>
                                            <td className="p-1.5 font-mono text-[10px] text-muted-foreground">
                                                {c.join(',')}
                                                {shape.colorStdDev && (
                                                    <span className="text-muted-foreground/50"> &plusmn;{shape.colorStdDev[0]}</span>
                                                )}
                                            </td>
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    className="w-14 bg-background border rounded px-1 py-0.5 text-xs"
                                                    placeholder="0.00"
                                                    value={committed?.y ?? ''}
                                                    onChange={(e) => handleConcentrationChange(shape.label, e.target.value)}
                                                />
                                            </td>
                                            <td className="p-1.5 font-mono text-muted-foreground text-[10px]">
                                                {predicted !== null && !isNaN(predicted) ? predicted.toFixed(3) : '\u2014'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Equations + Charts */}
                <div className="xl:col-span-3 space-y-4">
                    {/* Equations */}
                    {Object.keys(regressionModels).length > 0 && (
                        <div className="border rounded-lg p-3 bg-card">
                            <h3 className="text-xs font-semibold mb-2">Regression Equations</h3>
                            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                                {(['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'black', 'magnitude'] as ColorChannel[]).map(ch => {
                                    const model = regressionModels[ch]
                                    if (!model) return null
                                    return (
                                        <div key={ch} className="p-2 rounded bg-muted/30 text-[10px]">
                                            <span className="font-bold block" style={{ color: channelColors[ch] }}>{ch}</span>
                                            <div className="font-mono truncate" title={formatEquation(model)}>{formatEquation(model)}</div>
                                            <div className="text-muted-foreground">R²={model.r2.toFixed(3)} ({model.type})</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Charts */}
                    <div ref={chartsContainerRef}>
                    {overlayMode ? (
                        <div className="bg-card border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold">All Channels Overlay</h4>
                            </div>
                            <div className="h-72">
                                <Scatter options={chartOptions('magnitude')} data={createOverlayChartData()} />
                            </div>
                        </div>
                    ) : (
                        <div className={`grid gap-3 ${activeCharts.length === 1 ? 'grid-cols-1' : activeCharts.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                            {activeCharts.map(ch => (
                                <div key={ch} className="bg-card border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-semibold capitalize" style={{ color: channelColors[ch] }}>{ch}</h4>
                                        {regressionModels[ch] && (
                                            <span className="text-[10px] text-muted-foreground">
                                                R² = {regressionModels[ch].r2.toFixed(3)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-48">
                                        <Scatter
                                            options={chartOptions(ch)}
                                            data={createChartData(ch)}
                                            plugins={[errorBarPlugin]}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    )
}
