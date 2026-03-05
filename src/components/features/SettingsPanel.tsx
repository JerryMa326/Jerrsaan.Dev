import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Circle, Square, Info, Crosshair, Trash2, Database, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { hasCachedData } from '@/lib/cacheUtils'

function Tooltip({ text }: { text: string }) {
    const [show, setShow] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const triggerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (show && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            const viewportWidth = window.innerWidth
            const tooltipWidth = 200

            if (rect.right + tooltipWidth + 20 > viewportWidth) {
                if (rect.left - tooltipWidth - 20 > 0) {
                    setCoords({ top: rect.top, left: rect.left - tooltipWidth - 10 })
                } else {
                    setCoords({ top: rect.bottom + 5, left: rect.left - tooltipWidth / 2 })
                }
            } else {
                setCoords({ top: rect.top, left: rect.right + 10 })
            }
        }
    }, [show])

    return (
        <div className="relative inline-block z-[200]" ref={triggerRef}>
            <Info
                className="w-3 h-3 text-muted-foreground cursor-help ml-1 hover:text-foreground transition-colors"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            />
            {show && (
                <div
                    className="fixed z-[9999] w-48 p-2 bg-popover border rounded-md shadow-lg text-xs text-popover-foreground"
                    style={{ top: coords.top, left: coords.left }}
                >
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
        setRawRgbMode,
        calibrationMode,
        setCalibrationMode,
        images,
        colorCalibration,
        setColorCalibration,
        clearCache,
        isCacheLoaded
    } = useApp()
    const { toast } = useToast()

    const [isClearing, setIsClearing] = useState(false)
    const [cacheExists, setCacheExists] = useState(false)

    useEffect(() => {
        setCacheExists(hasCachedData())
    }, [isCacheLoaded])

    const handleClearCache = async () => {
        setIsClearing(true)
        try {
            await clearCache()
            setCacheExists(false)
            toast('Cache cleared', 'success')
        } finally {
            setIsClearing(false)
        }
    }

    const updateSetting = (key: keyof typeof detectionSettings, value: number | boolean | 'circle' | 'rectangle') => {
        setDetectionSettings(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="md:w-72 bg-card md:border-l flex flex-col h-full overflow-hidden">
            <div className="hidden md:block p-3 border-b bg-muted/50">
                <h3 className="font-semibold text-sm">Detection Settings</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-sm">
                {/* Detection Mode */}
                <div className="space-y-2" data-tutorial="detection-mode">
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
                                    <Tooltip text="Minimum circle radius in pixels. Set this to exclude small noise detections." />
                                </span>
                                <div className="flex items-center gap-1">
                                    <span>{detectionSettings.minRadius}px</span>
                                    <button
                                        onClick={() => setCalibrationMode('min')}
                                        disabled={images.length === 0}
                                        title="Draw a circle on the image to set min radius"
                                        className={`p-1 rounded hover:bg-muted transition-colors ${calibrationMode === 'min' ? 'bg-cyan-500/20 text-cyan-400' : 'text-muted-foreground'} ${images.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <Crosshair className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="1" max="200" step="1"
                                value={detectionSettings.minRadius}
                                onChange={e => updateSetting('minRadius', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                            {calibrationMode === 'min' && (
                                <div className="text-[10px] text-cyan-400 bg-cyan-500/10 p-1.5 rounded">
                                    Draw a circle around the <strong>smallest</strong> well to detect
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Max Radius
                                    <Tooltip text="Maximum circle radius in pixels. Set this to exclude large false detections." />
                                </span>
                                <div className="flex items-center gap-1">
                                    <span>{detectionSettings.maxRadius}px</span>
                                    <button
                                        onClick={() => setCalibrationMode('max')}
                                        disabled={images.length === 0}
                                        title="Draw a circle on the image to set max radius"
                                        className={`p-1 rounded hover:bg-muted transition-colors ${calibrationMode === 'max' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'text-muted-foreground'} ${images.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <Crosshair className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="10" max="500" step="1"
                                value={detectionSettings.maxRadius}
                                onChange={e => updateSetting('maxRadius', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                            {calibrationMode === 'max' && (
                                <div className="text-[10px] text-fuchsia-400 bg-fuchsia-500/10 p-1.5 rounded">
                                    Draw a circle around the <strong>largest</strong> well to detect
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">
                                    Sample Area %
                                    <Tooltip text="Percentage of shape area used for color sampling. Lower values sample only the center." />
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
                                    <Tooltip text="Minimum contour area in pixels². Filters out small noise." />
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
                                    <Tooltip text="Maximum contour area in pixels². Filters out large regions." />
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
                                    <Tooltip text="Contour approximation accuracy." />
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
                                    <Tooltip text="Percentage of shape area used for color sampling." />
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

                {/* Image Preprocessing Settings */}
                <div className="space-y-3 p-2 bg-violet-500/10 rounded-md border border-violet-500/30">
                    <h4 className="text-xs font-medium text-violet-400">Image Preprocessing</h4>
                    <p className="text-[10px] text-muted-foreground">
                        Enhance image before detection. Useful for poor lighting or low contrast.
                    </p>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs items-center">
                            <span className="flex items-center">Brightness<Tooltip text="Adjust overall image brightness." /></span>
                            <span>{detectionSettings.brightness}</span>
                        </div>
                        <input type="range" min="-100" max="100" step="5" value={detectionSettings.brightness}
                            onChange={e => updateSetting('brightness', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs items-center">
                            <span className="flex items-center">Contrast<Tooltip text="Adjust image contrast." /></span>
                            <span>{detectionSettings.contrast.toFixed(1)}x</span>
                        </div>
                        <input type="range" min="0.5" max="3.0" step="0.1" value={detectionSettings.contrast}
                            onChange={e => updateSetting('contrast', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs items-center">
                            <span className="flex items-center">Blur Kernel<Tooltip text="Size of Gaussian blur before detection." /></span>
                            <span>{detectionSettings.blurKernelSize}px</span>
                        </div>
                        <input type="range" min="3" max="15" step="2" value={detectionSettings.blurKernelSize}
                            onChange={e => updateSetting('blurKernelSize', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer" />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center">CLAHE<Tooltip text="Contrast Limited Adaptive Histogram Equalization." /></span>
                        <button
                            onClick={() => setDetectionSettings(prev => ({ ...prev, claheEnabled: !prev.claheEnabled }))}
                            className={`w-10 h-5 rounded-full transition-colors ${detectionSettings.claheEnabled ? 'bg-violet-500' : 'bg-muted'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${detectionSettings.claheEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {detectionSettings.claheEnabled && (
                        <div className="space-y-1 pl-2 border-l-2 border-violet-500/30">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">Clip Limit<Tooltip text="Controls contrast amplification." /></span>
                                <span>{detectionSettings.claheClipLimit.toFixed(1)}</span>
                            </div>
                            <input type="range" min="1.0" max="8.0" step="0.5" value={detectionSettings.claheClipLimit}
                                onChange={e => updateSetting('claheClipLimit', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center">Sharpening<Tooltip text="Enhances edges using unsharp mask." /></span>
                        <button
                            onClick={() => setDetectionSettings(prev => ({ ...prev, sharpenEnabled: !prev.sharpenEnabled }))}
                            className={`w-10 h-5 rounded-full transition-colors ${detectionSettings.sharpenEnabled ? 'bg-violet-500' : 'bg-muted'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${detectionSettings.sharpenEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                    </div>

                    {detectionSettings.sharpenEnabled && (
                        <div className="space-y-1 pl-2 border-l-2 border-violet-500/30">
                            <div className="flex justify-between text-xs items-center">
                                <span className="flex items-center">Amount<Tooltip text="Sharpening strength." /></span>
                                <span>{detectionSettings.sharpenAmount.toFixed(1)}x</span>
                            </div>
                            <input type="range" min="0.5" max="3.0" step="0.1" value={detectionSettings.sharpenAmount}
                                onChange={e => updateSetting('sharpenAmount', parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer" />
                        </div>
                    )}
                </div>

                {/* Color Mode */}
                <div className="border-t pt-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Color Mode</label>
                    <div className="grid grid-cols-4 gap-1">
                        {(['RGB', 'CMYK', 'HSL', 'HSV'] as const).map(mode => (
                            <Button key={mode} size="sm" variant={colorMode === mode ? 'default' : 'outline'}
                                onClick={() => setColorMode(mode)} className="text-xs px-1">
                                {mode}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Raw/Calibrated</label>
                    <Button size="sm" variant={rawRgbMode ? 'outline' : 'default'}
                        onClick={() => setRawRgbMode(!rawRgbMode)} className="w-full">
                        {rawRgbMode ? 'Raw RGB' : 'Calibrated RGB'}
                    </Button>
                </div>

                {/* Color Calibration */}
                <div className="space-y-3 p-2 bg-emerald-500/10 rounded-md border border-emerald-500/30">
                    <h4 className="text-xs font-medium text-emerald-400">Color Calibration</h4>
                    <p className="text-[10px] text-muted-foreground">
                        Pick white and black reference points from the image for calibrated color values.
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs">White Reference</span>
                            <div className="flex items-center gap-1">
                                {colorCalibration.whiteRef && (
                                    <>
                                        <div className="w-4 h-4 rounded border"
                                            style={{ backgroundColor: `rgb(${colorCalibration.whiteRef.join(',')})` }} />
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                            {colorCalibration.whiteRef.join(',')}
                                        </span>
                                        <button onClick={() => setColorCalibration(prev => ({ ...prev, whiteRef: null }))}
                                            className="p-0.5 text-muted-foreground hover:text-foreground">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setCalibrationMode('white')} disabled={images.length === 0}
                                    className={`p-1 rounded text-xs ${calibrationMode === 'white' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'} ${images.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <Crosshair className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                        {calibrationMode === 'white' && (
                            <div className="text-[10px] text-white bg-white/10 p-1.5 rounded">
                                Draw a circle on a <strong>white</strong> area of the image
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <span className="text-xs">Black Reference</span>
                            <div className="flex items-center gap-1">
                                {colorCalibration.blackRef && (
                                    <>
                                        <div className="w-4 h-4 rounded border"
                                            style={{ backgroundColor: `rgb(${colorCalibration.blackRef.join(',')})` }} />
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                            {colorCalibration.blackRef.join(',')}
                                        </span>
                                        <button onClick={() => setColorCalibration(prev => ({ ...prev, blackRef: null }))}
                                            className="p-0.5 text-muted-foreground hover:text-foreground">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setCalibrationMode('black')} disabled={images.length === 0}
                                    className={`p-1 rounded text-xs ${calibrationMode === 'black' ? 'bg-neutral-600/50 text-neutral-300' : 'bg-muted text-muted-foreground hover:text-foreground'} ${images.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <Crosshair className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                        {calibrationMode === 'black' && (
                            <div className="text-[10px] text-neutral-300 bg-neutral-600/20 p-1.5 rounded">
                                Draw a circle on a <strong>black</strong> area of the image
                            </div>
                        )}
                    </div>
                </div>

                {/* Cache Management */}
                <div className="border-t pt-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Browser Cache
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                        Your work is automatically saved to browser storage and restored when you return.
                    </p>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cacheExists ? 'bg-green-500' : 'bg-muted'}`} />
                        <span className="text-xs text-muted-foreground">
                            {cacheExists ? 'Cache active' : 'No cached data'}
                        </span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearCache}
                        disabled={isClearing || !cacheExists}
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {isClearing ? 'Clearing...' : 'Clear Cache'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
