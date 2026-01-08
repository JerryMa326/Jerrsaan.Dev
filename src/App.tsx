import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Beaker, Settings, Image as ImageIcon, BarChart3, Upload, Trash2,
  Wand2, Grid, ChevronLeft, ChevronRight, Palette, ListTree, Loader2
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { ImageViewer } from '@/components/features/ImageViewer'
import { RegressionStudio } from '@/components/features/RegressionStudio'
import { SettingsPanel } from '@/components/features/SettingsPanel'
import { ShapesList } from '@/components/features/ShapesList'
import { ColorAnalysisPanel } from '@/components/features/ColorAnalysisPanel'
import { isOpenCVReady, autoDetectCircles, autoDetectRectangles } from '@/lib/opencvUtils'

function App() {
  const [activeTab, setActiveTab] = useState<'detect' | 'analyze'>('detect')
  const [showSettings, setShowSettings] = useState(true)
  const [rightPanel, setRightPanel] = useState<'shapes' | 'colors'>('shapes')
  const [isDetecting, setIsDetecting] = useState(false)
  const {
    images, setImages, setCurrentImageIndex, currentImageIndex,
    removeImage, clearShapesForImage, isGridView, setIsGridView,
    shapes, setShapes, detectionSettings
  } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: HTMLImageElement[] = []
      const files = Array.from(e.target.files)

      let loadedCount = 0
      files.forEach(file => {
        const img = new Image()
        img.src = URL.createObjectURL(file)
        img.onload = () => {
          newImages.push(img)
          loadedCount++
          if (loadedCount === files.length) {
            setImages(prev => [...prev, ...newImages])
          }
        }
      })
    }
  }

  const handleAutoDetect = async () => {
    if (!isOpenCVReady()) {
      alert('OpenCV.js is still loading. Please wait a moment and try again.')
      return
    }

    const currentImage = images[currentImageIndex]
    if (!currentImage) return

    setIsDetecting(true)

    try {
      // Clear existing shapes for this image first
      const existingLabels = new Set(shapes.filter(s => s.imageIndex !== currentImageIndex).map(s => s.label))

      let newShapes
      if (detectionSettings.mode === 'circle') {
        newShapes = autoDetectCircles(currentImage, detectionSettings, currentImageIndex, existingLabels)
      } else {
        newShapes = autoDetectRectangles(currentImage, detectionSettings, currentImageIndex, existingLabels)
      }

      if (newShapes.length === 0) {
        alert('No shapes detected. Try adjusting the detection parameters.')
      } else {
        // Remove old shapes for this image and add new
        setShapes(prev => [
          ...prev.filter(s => s.imageIndex !== currentImageIndex),
          ...newShapes
        ])
      }
    } catch (error) {
      console.error('Detection error:', error)
      alert(`Detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDetecting(false)
    }
  }

  const handlePrevImage = () => {
    if (currentImageIndex > 0) setCurrentImageIndex(currentImageIndex - 1)
  }

  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) setCurrentImageIndex(currentImageIndex + 1)
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b bg-card px-4 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight">
            ChemClub Analyst
            <span className="text-xs font-normal text-muted-foreground ml-1">v3.0</span>
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={activeTab === 'detect' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('detect')}
          >
            <ImageIcon className="mr-1.5 h-4 w-4" />
            Detection
          </Button>
          <Button
            variant={activeTab === 'analyze' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('analyze')}
          >
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Regression
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            Load
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'detect' ? (
          <>
            {/* Left Sidebar - Image Thumbnails */}
            <div className="w-20 bg-card border-r flex flex-col shrink-0">
              <div className="p-2 border-b">
                <Button
                  size="sm"
                  variant={isGridView ? 'default' : 'ghost'}
                  className="w-full"
                  onClick={() => setIsGridView(!isGridView)}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative group cursor-pointer rounded overflow-hidden border-2 transition-all ${currentImageIndex === idx
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    onClick={() => {
                      setCurrentImageIndex(idx)
                      setIsGridView(false)
                    }}
                  >
                    <img src={img.src} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(idx)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-center py-0.5">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col relative bg-neutral-900">
              {/* Toolbar */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                <Button size="icon" variant="ghost" onClick={handlePrevImage} disabled={currentImageIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs w-16 text-center">
                  {images.length > 0 ? `${currentImageIndex + 1} / ${images.length}` : '—'}
                </span>
                <Button size="icon" variant="ghost" onClick={handleNextImage} disabled={currentImageIndex >= images.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-muted-foreground/30 mx-1" />
                <Button size="sm" variant="ghost" onClick={handleAutoDetect} disabled={images.length === 0 || isDetecting}>
                  {isDetecting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
                  {isDetecting ? 'Detecting...' : 'Auto'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clearShapesForImage(currentImageIndex)}
                  disabled={images.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>

              {images.length > 0 ? (
                <ImageViewer />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="text-muted-foreground">No images loaded</div>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Load Images
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Shapes/Colors */}
            <div className="w-64 bg-card border-l flex flex-col shrink-0">
              <div className="flex border-b">
                <button
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${rightPanel === 'shapes' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setRightPanel('shapes')}
                >
                  <ListTree className="h-4 w-4 inline mr-1" />
                  Shapes
                </button>
                <button
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${rightPanel === 'colors' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setRightPanel('colors')}
                >
                  <Palette className="h-4 w-4 inline mr-1" />
                  Colors
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {rightPanel === 'shapes' ? <ShapesList /> : <ColorAnalysisPanel />}
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && <SettingsPanel />}
          </>
        ) : (
          <RegressionStudio />
        )}
      </main>
    </div>
  )
}

export default App
