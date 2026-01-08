import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Line, Scatter } from 'react-chartjs-2'
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

export function RegressionStudio() {
    const { shapes, committedPoints, setCommittedPoints, regressionModels, setRegressionModels } = useApp()

    const handleConcentrationChange = (label: string, value: string) => {
        if (value === '') {
            // Remove the point if cleared
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

    const runRegression = () => {
        const points = committedPoints.map(pt => {
            const shape = shapes.find(s => s.label === pt.label)
            if (!shape) return null
            return { concentration: pt.y, color: shape.color }
        }).filter(Boolean) as { concentration: number, color: [number, number, number] }[]

        if (points.length < 2) {
            alert('Need at least 2 data points with known concentrations')
            return
        }

        const channels = ['red', 'green', 'blue'] as const
        const newModels: Record<string, { m: number; b: number; r2: number }> = {}

        channels.forEach((channel, idx) => {
            const n = points.length
            let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0

            points.forEach(pt => {
                const x = pt.concentration
                const y = pt.color[idx]
                sumX += x
                sumY += y
                sumXY += x * y
                sumXX += x * x
            })

            const denominator = n * sumXX - sumX * sumX
            if (Math.abs(denominator) < 1e-10) return // avoid division by zero

            const m = (n * sumXY - sumX * sumY) / denominator
            const b = (sumY - m * sumX) / n

            const meanY = sumY / n
            const ssTot = points.reduce((acc, pt) => acc + (pt.color[idx] - meanY) ** 2, 0)
            const ssRes = points.reduce((acc, pt) => acc + (pt.color[idx] - (m * pt.concentration + b)) ** 2, 0)
            const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0

            newModels[channel] = { m, b, r2 }
        })

        // Total magnitude regression
        const magPoints = points.map(pt => ({
            x: pt.concentration,
            y: Math.sqrt(pt.color[0] ** 2 + pt.color[1] ** 2 + pt.color[2] ** 2)
        }))

        const n = magPoints.length
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
        magPoints.forEach(pt => {
            sumX += pt.x
            sumY += pt.y
            sumXY += pt.x * pt.y
            sumXX += pt.x * pt.x
        })

        const denominator = n * sumXX - sumX * sumX
        if (Math.abs(denominator) > 1e-10) {
            const m = (n * sumXY - sumX * sumY) / denominator
            const b = (sumY - m * sumX) / n
            const meanY = sumY / n
            const ssTot = magPoints.reduce((acc, pt) => acc + (pt.y - meanY) ** 2, 0)
            const ssRes = magPoints.reduce((acc, pt) => acc + (pt.y - (m * pt.x + b)) ** 2, 0)
            newModels.magnitude = { m, b, r2: ssTot > 0 ? 1 - (ssRes / ssTot) : 0 }
        }

        setRegressionModels(newModels)
    }

    const predict = (colorValue: number, channel: string): number | null => {
        const model = regressionModels[channel]
        if (!model || Math.abs(model.m) < 1e-10) return null
        return (colorValue - model.b) / model.m
    }

    // Chart configuration
    const createChartData = (channel: 'red' | 'green' | 'blue', colorHex: string) => {
        const idx = channel === 'red' ? 0 : channel === 'green' ? 1 : 2

        const dataPoints = committedPoints.map(pt => {
            const shape = shapes.find(s => s.label === pt.label)
            if (!shape) return null
            return { x: pt.y, y: shape.color[idx] }
        }).filter(Boolean) as { x: number; y: number }[]

        const datasets: any[] = [{
            label: `${channel.charAt(0).toUpperCase() + channel.slice(1)} Data`,
            data: dataPoints,
            borderColor: colorHex,
            backgroundColor: colorHex,
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false
        }]

        // Add regression line if model exists
        const model = regressionModels[channel]
        if (model && dataPoints.length >= 2) {
            const xValues = dataPoints.map(p => p.x)
            const minX = Math.min(...xValues) - 0.1
            const maxX = Math.max(...xValues) + 0.1

            datasets.push({
                label: `Fit (R² = ${model.r2.toFixed(4)})`,
                data: [
                    { x: minX, y: model.m * minX + model.b },
                    { x: maxX, y: model.m * maxX + model.b }
                ],
                borderColor: colorHex,
                backgroundColor: 'transparent',
                borderDash: [5, 5],
                pointRadius: 0,
                showLine: true,
                borderWidth: 2
            })
        }

        return { datasets }
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    boxWidth: 12,
                    font: { size: 10 }
                }
            }
        },
        scales: {
            x: {
                type: 'linear' as const,
                title: { display: true, text: 'Concentration', font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.1)' }
            },
            y: {
                type: 'linear' as const,
                title: { display: true, text: 'Color Value (0-255)', font: { size: 11 } },
                min: 0,
                max: 255,
                grid: { color: 'rgba(255,255,255,0.1)' }
            }
        }
    }

    if (shapes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <p className="text-lg">No data available</p>
                    <p className="text-sm mt-2">Detect or draw shapes on images first</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-auto p-4 md:p-6 space-y-6 bg-background">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-xl font-bold">Regression Studio</h2>
                <Button onClick={runRegression} disabled={committedPoints.length < 2}>
                    Run Regression
                </Button>
            </div>

            {/* Data Table */}
            <div className="border rounded-lg overflow-x-auto bg-card">
                <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="p-3 text-left font-medium w-16">Label</th>
                            <th className="p-3 text-left font-medium">Color</th>
                            <th className="p-3 text-left font-medium w-24">R</th>
                            <th className="p-3 text-left font-medium w-24">G</th>
                            <th className="p-3 text-left font-medium w-24">B</th>
                            <th className="p-3 text-left font-medium w-24">Magnitude</th>
                            <th className="p-3 text-left font-medium w-32">Concentration</th>
                            <th className="p-3 text-left font-medium w-28">Predicted</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shapes.map(shape => {
                            const committed = committedPoints.find(p => p.label === shape.label)
                            const magnitude = Math.sqrt(shape.color[0] ** 2 + shape.color[1] ** 2 + shape.color[2] ** 2)
                            const predicted = regressionModels.magnitude ? predict(magnitude, 'magnitude') : null

                            return (
                                <tr key={shape.id} className="border-t border-muted hover:bg-muted/20">
                                    <td className="p-3 font-mono font-bold text-primary">{shape.label}</td>
                                    <td className="p-3">
                                        <div
                                            className="w-8 h-8 rounded border border-muted-foreground/30"
                                            style={{ backgroundColor: `rgb(${shape.color.join(',')})` }}
                                        />
                                    </td>
                                    <td className="p-3 font-mono text-red-400">{shape.color[0]}</td>
                                    <td className="p-3 font-mono text-green-400">{shape.color[1]}</td>
                                    <td className="p-3 font-mono text-blue-400">{shape.color[2]}</td>
                                    <td className="p-3 font-mono">{magnitude.toFixed(1)}</td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full bg-background border border-muted rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="0.00"
                                            value={committed?.y ?? ''}
                                            onChange={(e) => handleConcentrationChange(shape.label, e.target.value)}
                                        />
                                    </td>
                                    <td className="p-3 font-mono text-muted-foreground">
                                        {predicted !== null && !isNaN(predicted) ? predicted.toFixed(4) : '—'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Regression Equations */}
            {Object.keys(regressionModels).length > 0 && (
                <div className="bg-card border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Regression Equations</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['red', 'green', 'blue', 'magnitude'].map(ch => {
                            const model = regressionModels[ch]
                            if (!model) return null
                            const color = ch === 'red' ? 'text-red-400' : ch === 'green' ? 'text-green-400' : ch === 'blue' ? 'text-blue-400' : 'text-purple-400'
                            return (
                                <div key={ch} className="bg-muted/30 p-3 rounded-lg">
                                    <div className={`font-bold capitalize ${color}`}>{ch}</div>
                                    <div className="font-mono text-xs mt-1">
                                        y = {model.m.toFixed(2)}x + {model.b.toFixed(2)}
                                    </div>
                                    <div className="text-muted-foreground text-xs mt-1">
                                        R² = {model.r2.toFixed(4)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(['red', 'green', 'blue'] as const).map(ch => {
                    const colorHex = ch === 'red' ? '#ef4444' : ch === 'green' ? '#22c55e' : '#3b82f6'
                    return (
                        <div key={ch} className="bg-card border rounded-lg p-4">
                            <h4 className="text-sm font-semibold mb-3 capitalize">{ch} Channel</h4>
                            <div className="h-64">
                                <Scatter options={chartOptions} data={createChartData(ch, colorHex)} />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
