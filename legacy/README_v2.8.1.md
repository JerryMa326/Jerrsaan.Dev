# Chemistry Lab Color Analysis Tool - v2.8.1

## What This Tool Does

This is an all-in-one HTML application designed for chemistry labs and high school students working on colorimetric assays. It allows you to:

1. **Capture/Load** assay plate images
2. **Detect** colored wells automatically (circles or squares)
3. **Analyze** RGB/CMYK color values
4. **Calibrate** for accurate color measurements
5. **Perform Regression** to create calibration curves
6. **Predict** unknown concentrations from color

## What Was Fixed in v2.8.1

### Critical Bugs Resolved ✓

1. **Image Switching Issues**
   - Fixed ghost shapes appearing when switching between images
   - Shapes now stay properly associated with their original images
   - Clean transitions without visual artifacts

2. **Shape Preview Problems**  
   - Preview shapes no longer stick on screen
   - Properly cleared when switching images or modes
   - No more finnicky behavior

3. **Grid View Coordinate Issues**
   - Shapes now display at correct positions in grid thumbnails
   - Fixed aspect ratio transformations
   - Improved visibility of shape markers

4. **Small Improvements**
   - Added keyboard navigation (arrow keys)
   - Visual feedback for selection mode
   - Better error handling
   - Prevented tiny accidental shapes

## How to Use

### Basic Workflow

1. **Open the file**: Double-click `2.8.0.html` in any modern browser
2. **Load images**: Press `O` or click "Add Images" to load assay photos
3. **Navigate**: Use arrow keys ← → to switch between images
4. **Detect shapes**: 
   - Press `A` for auto-detection, or
   - Press `1` for rectangle, `2` for circle and draw manually
5. **Enter data**: Switch to "Regression Studio" tab
6. **Input concentrations**: Enter known molarity values
7. **Run regression**: Click "Run Regression" for calibration curves
8. **Predict unknowns**: Select shape and click "Predict"

### Quick Reference

**Essential Shortcuts:**
- `←` `→` - Navigate between images
- `1` `2` - Switch drawing mode
- `A` - Auto-detect shapes
- `G` - Grid view (see all images)
- `R` - Reset shapes
- `C` - Capture screenshot

**Selection Modes:**
- Press `1` for rectangles (blue ■)
- Press `2` for circles (green ●)

## Files in This Package

- **2.8.0.html** - Main application (single file, run anywhere)
- **BUGFIXES_v2.8.1.md** - Detailed technical fixes
- **TESTING_GUIDE.md** - How to test the application
- **README_v2.8.1.md** - This file

## Technical Details

- **Self-contained**: Everything in one HTML file
- **No installation**: Just open in browser
- **OpenCV.js**: For image processing
- **Local storage**: Saves your work automatically

## Browser Requirements

- **Recommended**: Chrome or Edge (best performance)
- **Also works**: Firefox, Safari
- **Requires**: JavaScript enabled
- **Optional**: Webcam (can use image files instead)

## Typical Use Cases

### 1. Colorimetric Assays
- Load photos of 96-well plates
- Auto-detect all wells
- Enter known standard concentrations
- Generate calibration curve
- Predict unknown sample concentrations

### 2. Titration Analysis
- Capture color changes
- Draw regions of interest
- Track RGB/CMYK values
- Calibrate against known values

### 3. Paper-Based Assays
- Photograph test strips or spots
- Detect colored regions
- Compare to color standards
- Quantify results

### 4. Educational Use
- Teach Beer-Lambert law
- Demonstrate color theory
- Practice data analysis
- Learn regression techniques

## Features

### Detection
- ✓ Automatic circle detection (Hough Circles)
- ✓ Automatic square detection (contour finding)
- ✓ Manual drawing (rectangle/circle)
- ✓ Bounding box to limit detection area
- ✓ Adjustable detection parameters

### Color Analysis
- ✓ RGB color extraction
- ✓ CMYK conversion
- ✓ Calibration mode for color correction
- ✓ Per-image shape tracking
- ✓ Visual labels (a, b, c...)

### Data Management
- ✓ Multiple image support
- ✓ Grid view for overview
- ✓ CSV export
- ✓ Model import/export
- ✓ Auto-save to browser storage

### Analysis
- ✓ Linear regression (7 components)
- ✓ R² calculation
- ✓ Interactive charts
- ✓ Axis swapping
- ✓ Concentration prediction
- ✓ Decimal precision control

## Known Limitations

1. **Image Size**: Very large images (>10MB) may slow performance
2. **Browser**: Internet Explorer not supported
3. **Rotation**: Rotating after drawing shapes may misalign them
4. **OpenCV Load**: First load may take 5-10 seconds

## Tips for Best Results

### Image Quality
- Use good lighting
- Avoid shadows
- Keep camera parallel to plate
- Use consistent background

### Detection
- Start with default parameters
- Adjust if needed for your specific assay
- Use bounding box for crowded images
- Try both circle and square modes

### Calibration
- Use at least 3-5 known standards
- Cover the expected concentration range
- Check R² values (>0.95 is good)
- Repeat measurements for accuracy

### Workflow
- Name your images in Regression Studio
- Export model regularly (save your work)
- Use CSV export for external analysis
- Test with known samples first

## Troubleshooting

**Images won't load?**
- Check file format (JPG, PNG)
- Try smaller files
- Check browser console (F12)

**Auto-detect finds nothing?**
- Adjust Param1 (30-50) and Param2 (40-60)
- Set correct radius range
- Use bounding box
- Check image contrast

**Shapes in wrong place?**
- This was the main bug - now fixed!
- Make sure you're viewing the correct image
- Try toggling grid view

**Performance slow?**
- Use fewer images
- Reduce image file sizes
- Close other browser tabs
- Use Chrome/Edge

## Support & Development

This tool was designed for chemistry education and research. All code is contained in a single HTML file for easy distribution.

**Version History:**
- v2.8.0 - Original robust implementation
- v2.8.1 - Fixed image switching and shape preview issues

**Credits:**
- OpenCV.js for computer vision
- Chart.js concepts for visualization
- Designed for high school chemistry clubs and lab work

## License

This is an educational tool. Feel free to use and modify for educational and research purposes.

---

**Current Version**: 2.8.1  
**Status**: Stable - Image switching and preview issues resolved  
**File**: Single HTML file (no dependencies except internet for OpenCV.js CDN)  
**Last Updated**: 2025
