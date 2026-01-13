import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Scatter } from 'react-chartjs-2'
import { rgbToCmyk } from '@/lib/imageUtils'
import { Download, Upload } from 'lucide-react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ScatterController
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
    regressionModels: Record<string, { m: number; b: number; r2: number }>
}

export function RegressionStudio() {
    const { shapes, committedPoints, setCommittedPoints, regressionModels, setRegressionModels } = useApp()
    const [activeCharts, setActiveCharts] = useState<ColorChannel[]>(['red', 'green', 'blue'])
    const [selectedPoint, setSelectedPoint] = useState<{ label: string; color: [number, number, number] } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
        const cmyk = rgbToCmyk(color)
        switch (channel) {
            case 'red': return color[0]
            case 'green': return color[1]
            case 'blue': return color[2]
            case 'cyan': return cmyk[0] * 100
            case 'magenta': return cmyk[1] * 100
            case 'yellow': return cmyk[2] * 100
            case 'black': return cmyk[3] * 100
            case 'magnitude': return Math.sqrt(color[0] ** 2 + color[1] ** 2 + color[2] ** 2)
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
            alert('Need at least 2 data points with known concentrations')
            return
        }

        const channels: ColorChannel[] = ['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'black', 'magnitude']
        const newModels: Record<string, { m: number; b: number; r2: number }> = {}

        channels.forEach(channel => {
            const n = points.length
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

            points.forEach(pt => {
                const x = pt.concentration
                const y = getColorValue(pt.color, channel)
                sumX += x
                sumY += y
                sumXY += x * y
                sumXX += x * x
            })

            const denominator = n * sumXX - sumX * sumX
            if (Math.abs(denominator) < 1e-10) return

            const m = (n * sumXY - sumX * sumY) / denominator
            const b = (sumY - m * sumX) / n

            const meanY = sumY / n
            const ssTot = points.reduce((acc, pt) => acc + (getColorValue(pt.color, channel) - meanY) ** 2, 0)
            const ssRes = points.reduce((acc, pt) => acc + (getColorValue(pt.color, channel) - (m * pt.concentration + b)) ** 2, 0)
            const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0

            newModels[channel] = { m, b, r2 }
        })

        setRegressionModels(newModels)
    }

    const exportModel = () => {
        const exportData: ExportedModel = {
            version: '3.0',
            exportDate: new Date().toISOString(),
            committedPoints: committedPoints,
            shapeData: shapes.map(s => ({ label: s.label, color: s.color })),
            regressionModels: regressionModels
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chemclub-model-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const importModel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const data: ExportedModel = JSON.parse(event.target?.result as string)

                if (data.committedPoints) {
                    setCommittedPoints(data.committedPoints)
                }
                if (data.regressionModels) {
                    setRegressionModels(data.regressionModels)
                }

                alert(`Imported model from ${data.exportDate || 'unknown date'} with ${data.committedPoints?.length || 0} data points`)
            } catch (err) {
                alert('Failed to import model: Invalid file format')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const predict = (colorValue: number, channel: string): number | null => {
        const model = regressionModels[channel]
        if (!model || Math.abs(model.m) < 1e-10) return null
        return (colorValue - model.b) / model.m
    }

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
                color: shape.color
            }
        }).filter(Boolean) as { x: number; y: number; label: string; color: [number, number, number] }[]

        const datasets: any[] = [{
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

            datasets.push({
                label: `R² = ${model.r2.toFixed(4)}`,
                data: [
                    { x: minX, y: model.m * minX + model.b },
                    { x: maxX, y: model.m * maxX + model.b }
                ],
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

    const chartOptions = (channel: ColorChannel) => ({
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_: any, elements: any[]) => {
            if (elements.length > 0) {
                const dataIndex = elements[0].index
                const pt = committedPoints[dataIndex]
                const shape = shapes.find(s => s.label === pt?.label)
                if (shape) {
                    setSelectedPoint({ label: shape.label, color: shape.color })
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const point = context.raw
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
                title: { display: true, text: channel, font: { size: 10 } },
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
            {/* Header - Full Width */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <h2 className="text-lg font-bold">Regression Studio</h2>
                <div className="flex gap-2">
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
                        <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                    <Button size="sm" onClick={runRegression} disabled={committedPoints.length < 2}>
                        Run Regression
                    </Button>
                </div>
            </div>

            {/* Channel Toggle - Full Width */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-card rounded-lg border">
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
                    >×</button>
                </div>
            )}

            {/* Main Content Grid - Full Width */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                {/* Data Table - Takes 1 column */}
                <div className="xl:col-span-1 border rounded-lg overflow-hidden bg-card">
                    <div className="p-2 bg-muted/50 border-b text-xs font-semibold">Data Points</div>
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/30 sticky top-0">
                                <tr>
                                    <th className="p-1.5 text-left">Label</th>
                                    <th className="p-1.5 text-left">RGB</th>
                                    <th className="p-1.5 text-left">Conc. (mM)</th>
                                    <th className="p-1.5 text-left">Pred. (mM)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shapes.map(shape => {
                                    const committed = committedPoints.find(p => p.label === shape.label)
                                    const magnitude = Math.sqrt(shape.color[0] ** 2 + shape.color[1] ** 2 + shape.color[2] ** 2)
                                    const predicted = regressionModels.magnitude ? predict(magnitude, 'magnitude') : null

                                    return (
                                        <tr key={shape.id} className="border-t border-muted hover:bg-muted/20">
                                            <td className="p-1.5">
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="w-3 h-3 rounded"
                                                        style={{ backgroundColor: `rgb(${shape.color.join(',')})` }}
                                                    />
                                                    <span className="font-mono font-bold">{shape.label}</span>
                                                </div>
                                            </td>
                                            <td className="p-1.5 font-mono text-[10px] text-muted-foreground">
                                                {shape.color.join(',')}
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
                                                {predicted !== null && !isNaN(predicted) ? predicted.toFixed(3) : '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Equations + Charts - Takes 3 columns */}
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
                                            <div className="font-mono">y={model.m.toFixed(1)}x+{model.b.toFixed(0)}</div>
                                            <div className="text-muted-foreground">R²={model.r2.toFixed(3)}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Charts Grid */}
                    <div className={`grid gap-3 ${activeCharts.length === 1 ? 'grid-cols-1' : activeCharts.length <= 2 ? 'grid-cols-2' : activeCharts.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'}`}>
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
                                    <Scatter options={chartOptions(ch) as any} data={createChartData(ch)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
