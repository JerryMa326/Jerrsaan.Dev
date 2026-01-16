import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Settings, Image as ImageIcon, BarChart3, Upload, Trash2,
  Wand2, Grid, ChevronLeft, ChevronRight, Palette, ListTree, Loader2,
  Menu, X, ChevronDown, Plus
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
  const [showSettings, setShowSettings] = useState(true) // Default to open for better UX
  const [rightPanel, setRightPanel] = useState<'shapes' | 'colors'>('shapes')
  const [isDetecting, setIsDetecting] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'none' | 'images' | 'info' | 'settings'>('none')
  const {
    images, setImages, setCurrentImageIndex, currentImageIndex,
    removeImage, clearShapesForImage, isGridView, setIsGridView,
    shapes, setShapes, detectionSettings, boundingBox
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

    // Use setTimeout to allow the UI to update (show spinner) before heavy computation
    setTimeout(() => {
      try {
        const existingLabels = new Set(shapes.filter(s => s.imageIndex !== currentImageIndex).map(s => s.label))

        let newShapes
        if (detectionSettings.mode === 'circle') {
          newShapes = autoDetectCircles(currentImage, detectionSettings, currentImageIndex, existingLabels, boundingBox)
        } else {
          newShapes = autoDetectRectangles(currentImage, detectionSettings, currentImageIndex, existingLabels, boundingBox)
        }

        if (newShapes.length === 0) {
          alert('No shapes detected. Try adjusting the detection parameters.')
        } else {
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
    }, 50)
  }

  const handlePrevImage = () => {
    if (currentImageIndex > 0) setCurrentImageIndex(currentImageIndex - 1)
  }

  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) setCurrentImageIndex(currentImageIndex + 1)
  }

  const currentShapeCount = shapes.filter(s => s.imageIndex === currentImageIndex).length

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden">
      {/* Header - Mobile Responsive */}
      <header className="flex h-12 md:h-12 items-center justify-between border-b bg-card px-2 md:px-4 shrink-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/favicon-removebg-preview.png" alt="ChemClub" className="h-5 w-5 md:h-6 md:w-6" />
          <h1 className="text-xs md:text-sm font-semibold tracking-tight">
            <span className="hidden sm:inline">ChemClub Analyst</span>
            <span className="sm:hidden">ChemClub</span>
            <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-1">v3.1</span>
          </h1>
        </div>

        {/* Desktop Tab Buttons */}
        <div className="hidden sm:flex items-center gap-1">
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

        {/* Mobile Tab Buttons */}
        <div className="flex sm:hidden items-center gap-0.5">
          <Button
            variant={activeTab === 'detect' ? 'default' : 'ghost'}
            size="sm"
            className="px-2 h-8"
            onClick={() => setActiveTab('detect')}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'analyze' ? 'default' : 'ghost'}
            size="sm"
            className="px-2 h-8"
            onClick={() => setActiveTab('analyze')}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 px-2 md:px-3" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 md:mr-1.5" />
            <span className="hidden md:inline">Load</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
          />
          {/* Desktop Settings */}
          <Button
            variant={showSettings ? 'default' : 'ghost'}
            size="icon"
            className="hidden md:flex h-8 w-8 relative z-30"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          {/* Mobile Menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobilePanel(mobilePanel === 'none' ? 'settings' : 'none')}
          >
            {mobilePanel !== 'none' ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'detect' ? (
          <>
            {/* Left Sidebar - Image Thumbnails (Hidden on Mobile) */}
            <div className="hidden md:flex w-20 bg-card border-r flex-col shrink-0">
              <div className="p-2 border-b flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
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
                    <img src={img.src} className="w-full aspect-square object-cover" alt={`Image ${idx + 1}`} />
                    <button
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 hover:bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete image ${idx + 1}?`)) {
                          removeImage(idx)
                        }
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-center py-0.5">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 min-w-0 flex flex-col relative bg-neutral-900 overflow-hidden">
              {/* Toolbar - Responsive */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 md:gap-1 bg-black/60 backdrop-blur-sm px-1.5 md:px-2 py-1 rounded-lg">
                <Button size="icon" variant="ghost" className="h-7 w-7 md:h-8 md:w-8" onClick={handlePrevImage} disabled={currentImageIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[10px] md:text-xs w-12 md:w-16 text-center">
                  {images.length > 0 ? `${currentImageIndex + 1}/${images.length}` : '—'}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7 md:h-8 md:w-8" onClick={handleNextImage} disabled={currentImageIndex >= images.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-muted-foreground/30 mx-0.5 md:mx-1" />
                <Button size="sm" variant="ghost" className="h-7 md:h-8 px-1.5 md:px-2 text-xs" onClick={handleAutoDetect} disabled={images.length === 0 || isDetecting}>
                  {isDetecting ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <Wand2 className="h-3 w-3 md:h-4 md:w-4" />}
                  <span className="hidden sm:inline ml-1">{isDetecting ? 'Detecting...' : 'Auto'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 md:h-8 px-1.5 md:px-2 text-xs"
                  onClick={() => clearShapesForImage(currentImageIndex)}
                  disabled={images.length === 0}
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline ml-1">Clear</span>
                </Button>
              </div>

              {/* Mobile Bottom Bar */}
              <div className="md:hidden absolute bottom-0 left-0 right-0 z-10 flex bg-card/95 backdrop-blur-sm border-t">
                <button
                  className={`flex-1 py-2.5 text-xs font-medium flex flex-col items-center gap-0.5 ${mobilePanel === 'images' ? 'text-primary bg-muted' : 'text-muted-foreground'}`}
                  onClick={() => setMobilePanel(mobilePanel === 'images' ? 'none' : 'images')}
                >
                  <Grid className="h-4 w-4" />
                  <span>Images ({images.length})</span>
                </button>
                <button
                  className={`flex-1 py-2.5 text-xs font-medium flex flex-col items-center gap-0.5 ${mobilePanel === 'info' ? 'text-primary bg-muted' : 'text-muted-foreground'}`}
                  onClick={() => setMobilePanel(mobilePanel === 'info' ? 'none' : 'info')}
                >
                  <Palette className="h-4 w-4" />
                  <span>Shapes ({currentShapeCount})</span>
                </button>
                <button
                  className={`flex-1 py-2.5 text-xs font-medium flex flex-col items-center gap-0.5 ${mobilePanel === 'settings' ? 'text-primary bg-muted' : 'text-muted-foreground'}`}
                  onClick={() => setMobilePanel(mobilePanel === 'settings' ? 'none' : 'settings')}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </div>

              {images.length > 0 ? (
                <ImageViewer />
              ) : (
                <div className="h-full w-full flex items-center justify-center pb-16 md:pb-0">
                  <div className="text-center space-y-4 px-4">
                    <div className="text-muted-foreground">No images loaded</div>
                    <Button onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      Load Images
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Shapes/Colors (Hidden on Mobile) */}
            <div className="hidden md:flex w-64 bg-card border-l flex-col shrink-0">
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

            {/* Desktop Settings Panel */}
            {showSettings && <div className="hidden md:flex shrink-0"><SettingsPanel /></div>}

            {/* Mobile Slide-up Panels */}
            {mobilePanel !== 'none' && (
              <div className="md:hidden absolute inset-x-0 bottom-14 z-20 bg-card border-t rounded-t-xl shadow-xl max-h-[60vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold text-sm">
                    {mobilePanel === 'images' && 'Images'}
                    {mobilePanel === 'info' && 'Shapes & Colors'}
                    {mobilePanel === 'settings' && 'Settings'}
                  </h3>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMobilePanel('none')}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {mobilePanel === 'images' && (
                    <div className="p-3">
                      <Button
                        className="w-full mb-3"
                        variant="outline"
                        onClick={() => {
                          fileInputRef.current?.click()
                          setMobilePanel('none')
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Images
                      </Button>
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            className={`relative cursor-pointer rounded overflow-hidden border-2 ${currentImageIndex === idx ? 'border-primary' : 'border-transparent'}`}
                          >
                            <img
                              src={img.src}
                              className="w-full aspect-square object-cover"
                              alt={`Image ${idx + 1}`}
                              onClick={() => {
                                setCurrentImageIndex(idx)
                                setMobilePanel('none')
                              }}
                            />
                            <button
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 hover:bg-destructive rounded-full flex items-center justify-center"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm(`Delete image ${idx + 1}?`)) {
                                  removeImage(idx)
                                }
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-center">
                              {idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      {images.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No images loaded
                        </div>
                      )}
                    </div>
                  )}
                  {mobilePanel === 'info' && (
                    <div className="space-y-0">
                      <div className="flex border-b">
                        <button
                          className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'shapes' ? 'bg-muted' : ''}`}
                          onClick={() => setRightPanel('shapes')}
                        >
                          Shapes
                        </button>
                        <button
                          className={`flex-1 py-2 text-xs font-medium ${rightPanel === 'colors' ? 'bg-muted' : ''}`}
                          onClick={() => setRightPanel('colors')}
                        >
                          Colors
                        </button>
                      </div>
                      {rightPanel === 'shapes' ? <ShapesList /> : <ColorAnalysisPanel />}
                    </div>
                  )}
                  {mobilePanel === 'settings' && <SettingsPanel />}
                </div>
              </div>
            )}
          </>
        ) : (
          <RegressionStudio />
        )}
      </main>

      {/* Watermark */}
      <footer className="h-6 flex items-center justify-center bg-card/50 border-t text-[10px] text-muted-foreground shrink-0">
        Created by Hassaan Vani, Grady Chen, and Jerry Ma
      </footer>
    </div>
  )
}

export default App
