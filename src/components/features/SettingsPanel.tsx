import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Circle, Square, Info } from 'lucide-react'
import { useState } from 'react'

function Tooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false)
    return (
        <div className="relative inline-block">
            <Info
                className="w-3 h-3 text-muted-foreground cursor-help ml-1"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            />
            {show && (
                <div className="absolute z-50 left-4 top-0 w-48 p-2 bg-popover border rounded-md shadow-lg text-xs text-popover-foreground">
                    {text}
                </div>
            )}
        </div>
    )
}

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
        <div className="md:w-72 bg-card md:border-l flex flex-col h-full overflow-hidden">
            <div className="hidden md:block p-3 border-b bg-muted/50">
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
                        <h4 className="text-xs font-medium text-blue-400">Circle Detection (Hough Transform)</h4>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Param1 (Edge)
                                    <Tooltip text="Canny edge detection threshold. Higher values detect fewer, stronger edges. Decrease if circles aren't being detected." />
                                </span>
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
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Param2 (Accum)
                                    <Tooltip text="Circle accumulator threshold. Lower values detect more circles (including false positives). Increase to reduce false detections." />
                                </span>
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
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Min Radius
                                    <Tooltip text="Minimum circle radius in pixels. Set this to exclude small noise detections. Should be smaller than your smallest wells." />
                                </span>
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
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Max Radius
                                    <Tooltip text="Maximum circle radius in pixels. Set this to exclude large false detections. Should be larger than your biggest wells." />
                                </span>
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
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Sample Area %
                                    <Tooltip text="Percentage of shape area used for color sampling. Lower values sample only the center, avoiding edge artifacts and reflections." />
                                </span>
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
                        <h4 className="text-xs font-medium text-green-400">Square Detection (Contour Analysis)</h4>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Min Area
                                    <Tooltip text="Minimum contour area in pixels². Filters out small noise. Increase if detecting too many small false shapes." />
                                </span>
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
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Max Area
                                    <Tooltip text="Maximum contour area in pixels². Filters out large regions. Decrease if detecting the entire image as a shape." />
                                </span>
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
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Epsilon
                                    <Tooltip text="Contour approximation accuracy. Lower values keep more detail (jagged squares). Higher values smooth contours (may miss squares)." />
                                </span>
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

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Sample Area %
                                    <Tooltip text="Percentage of shape area used for color sampling. Lower values sample only the center, avoiding edge artifacts." />
                                </span>
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
