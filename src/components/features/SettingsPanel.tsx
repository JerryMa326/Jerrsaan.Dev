import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Circle, Square } from 'lucide-react'

export function SettingsPanel() {
    const {
        detectionSettings,
        setDetectionSettings,
        colorMode,
        setColorMode,
        rawRgbMode,
        setRawRgbMode
    } = useApp()

    const updateSetting = (key: keyof typeof detectionSettings, value: number | 'circle' | 'rectangle') => {
        setDetectionSettings(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="w-72 bg-card border-l flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
                <h3 className="font-semibold text-sm">Detection Settings</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-sm">
                {/* Detection Mode */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Detection Mode</label>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={detectionSettings.mode === 'circle' ? 'default' : 'outline'}
                            onClick={() => updateSetting('mode', 'circle')}
                            className="flex-1"
                        >
                            <Circle className="w-4 h-4 mr-1" /> Circle
                        </Button>
                        <Button
                            size="sm"
                            variant={detectionSettings.mode === 'rectangle' ? 'default' : 'outline'}
                            onClick={() => updateSetting('mode', 'rectangle')}
                            className="flex-1"
                        >
                            <Square className="w-4 h-4 mr-1" /> Square
                        </Button>
                    </div>
                </div>

                {/* Circle Parameters */}
                {detectionSettings.mode === 'circle' && (
                    <div className="space-y-3 p-2 bg-muted/30 rounded-md">
                        <h4 className="text-xs font-medium text-blue-400">Circle Detection</h4>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Param1 (Edge)</span>
                                <span>{detectionSettings.param1}</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="300" step="1"
                                value={detectionSettings.param1}
                                onChange={e => updateSetting('param1', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Param2 (Accum)</span>
                                <span>{detectionSettings.param2}</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="200" step="1"
                                value={detectionSettings.param2}
                                onChange={e => updateSetting('param2', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Min Radius</span>
                                <span>{detectionSettings.minRadius}px</span>
                            </div>
                            <input
                                type="range"
                                min="1" max="200" step="1"
                                value={detectionSettings.minRadius}
                                onChange={e => updateSetting('minRadius', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Max Radius</span>
                                <span>{detectionSettings.maxRadius}px</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="500" step="1"
                                value={detectionSettings.maxRadius}
                                onChange={e => updateSetting('maxRadius', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Sample Area %</span>
                                <span>{detectionSettings.restrictedArea}%</span>
                            </div>
                            <input
                                type="range"
                                min="10" max="100" step="5"
                                value={detectionSettings.restrictedArea}
                                onChange={e => updateSetting('restrictedArea', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* Rectangle Parameters */}
                {detectionSettings.mode === 'rectangle' && (
                    <div className="space-y-3 p-2 bg-muted/30 rounded-md">
                        <h4 className="text-xs font-medium text-green-400">Square Detection</h4>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Min Area</span>
                                <span>{detectionSettings.minArea}px²</span>
                            </div>
                            <input
                                type="range"
                                min="100" max="10000" step="100"
                                value={detectionSettings.minArea}
                                onChange={e => updateSetting('minArea', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Max Area</span>
                                <span>{detectionSettings.maxArea}px²</span>
                            </div>
                            <input
                                type="range"
                                min="1000" max="100000" step="1000"
                                value={detectionSettings.maxArea}
                                onChange={e => updateSetting('maxArea', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Epsilon Factor</span>
                                <span>{detectionSettings.epsilon.toFixed(3)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.01" max="0.1" step="0.005"
                                value={detectionSettings.epsilon}
                                onChange={e => updateSetting('epsilon', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                <div className="border-t pt-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Color Mode</label>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={colorMode === 'RGB' ? 'default' : 'outline'}
                            onClick={() => setColorMode('RGB')}
                            className="flex-1"
                        >
                            RGB
                        </Button>
                        <Button
                            size="sm"
                            variant={colorMode === 'CMYK' ? 'default' : 'outline'}
                            onClick={() => setColorMode('CMYK')}
                            className="flex-1"
                        >
                            CMYK
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Raw/Calibrated</label>
                    <Button
                        size="sm"
                        variant={rawRgbMode ? 'outline' : 'default'}
                        onClick={() => setRawRgbMode(!rawRgbMode)}
                        className="w-full"
                    >
                        {rawRgbMode ? 'Raw RGB' : 'Calibrated RGB'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
