# Color Analysis Tool - Testing Guide

## Quick Start Test

### 1. Load the Application
- Open `2.8.0.html` in a modern browser (Chrome/Edge recommended)
- Allow camera access if prompted (optional - you can use image files instead)

### 2. Test Image Loading & Switching

**Load Multiple Images:**
1. Press `O` key or click "Add Images" button
2. Select 3-4 chemistry assay images (or any images)
3. Wait for images to load (check console for "Loaded X images successfully")

**Test Switching:**
- Use **Left Arrow (←)** to go to previous image
- Use **Right Arrow (→)** to go to next image
- Click thumbnails at top of Regression Studio tab
- Verify no ghost shapes appear when switching

### 3. Test Shape Detection

**Manual Drawing:**
1. Press `1` for Rectangle mode (UI shows blue ■ Rectangle)
2. Click and drag to draw a rectangle
3. Press `2` for Circle mode (UI shows green ● Circle)
4. Click and drag to draw a circle
5. Try making tiny shapes - they should be rejected (< 5 pixels)

**Auto-Detection:**
1. Load an assay plate image
2. Adjust detection parameters:
   - Param1: 30-50 (edge detection sensitivity)
   - Param2: 40-60 (circle detection accuracy)
   - Min Radius: 10-20
   - Max Radius: 80-120
3. Press `A` to auto-detect
4. Verify circles are detected on wells

### 4. Test Grid View

**Enter Grid View:**
1. Load 3+ images with shapes drawn on each
2. Press `G` to enter grid view
3. Verify:
   - All images appear as thumbnails
   - Shapes are visible on correct images
   - Shapes are positioned correctly (not misaligned)
   - Current image is highlighted with blue border

**Navigate in Grid:**
1. Click any image thumbnail
2. Verify it exits grid view and shows that image
3. Shapes should match the image

### 5. Test Shape Preview

**Preview Behavior:**
1. Start drawing a shape (don't release mouse)
2. Move mouse around - preview should follow
3. Switch images using arrow keys
4. Verify preview disappears (not stuck on screen)

### 6. Test Regression Studio

**Add Data Points:**
1. Draw/detect shapes on multiple images
2. Switch to "Regression Studio" tab
3. Enter known molarity values for each shape
4. Click "Run Regression"
5. Verify charts appear with proper regression lines

**Predict Unknown:**
1. Select a shape without molarity
2. Click "Predict"
3. Verify predicted concentration appears

## Common Issues to Watch For

### ✓ FIXED - Image Switching
- **OLD**: Ghost shapes appear when switching images
- **NEW**: Clean transitions, no artifacts

### ✓ FIXED - Shape Preview
- **OLD**: Preview shapes stick on screen
- **NEW**: Previews clear properly when switching

### ✓ FIXED - Grid View
- **OLD**: Shapes misaligned in grid thumbnails
- **NEW**: Shapes positioned correctly

### ✓ FIXED - Tiny Shapes
- **OLD**: Accidental clicks create invisible shapes
- **NEW**: Small shapes (< 5px) are rejected

## Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| `1` | Rectangle selection mode |
| `2` | Circle selection mode |
| `←` | Previous image |
| `→` | Next image |
| `G` | Toggle grid view |
| `B` | Bounding box mode (limit detection area) |
| `C` | Capture screenshot |
| `O` | Open images |
| `R` | Reset shapes (current image or all in grid) |
| `A` | Auto-detect shapes |

## Expected Behavior

### Image Switching
- Shapes should stay with their original images
- UI should update immediately
- No visual glitches or delays
- Thumbnails highlight active image

### Shape Drawing
- Clear visual feedback of mode (Rectangle/Circle)
- Preview follows mouse during drawing
- Tiny accidental clicks ignored
- Shapes saved per-image

### Grid View
- Read-only view of all images
- Shapes visible and correctly positioned
- Click to edit individual image
- Active image highlighted

### Auto-Detection
- Works with both circles and rectangles
- Respects bounding box if set
- Shapes labeled alphabetically (a, b, c...)
- Can re-run to update detection

## Performance Tips

1. **Image Size**: Use images < 5MB for best performance
2. **Number of Images**: 10-20 images work well
3. **Shape Count**: 50-100 shapes total is reasonable
4. **Browser**: Chrome/Edge recommended for best OpenCV.js performance

## Troubleshooting

**Issue**: Images not loading
- Check console (F12) for errors
- Verify image format (jpg, png supported)
- Try smaller images

**Issue**: Auto-detect finds nothing
- Adjust Param1 and Param2 values
- Set appropriate radius range
- Try using bounding box to limit area
- Check image has sufficient contrast

**Issue**: Shapes not visible
- Verify you're on the correct image
- Check shapes aren't too small
- Try toggling grid view

**Issue**: Performance slow
- Reduce number of loaded images
- Use smaller image files
- Close other browser tabs

## Data Export

**CSV Export**:
- Click "Download CSV" in Regression Studio
- Contains RGB, CMYK, molarity for all shapes

**Model Export**:
- Click "Export Model"
- Saves all shapes, calibration, settings
- Can import later to restore session

## Advanced Features

### Calibration
1. Click "Calibrate" button
2. Click on pure Red, Green, Blue, Yellow, Pink disks in order
3. Click "Finish" when done
4. Toggle "Raw RGB" / "True RGB" to apply correction

### Bounding Box
1. Press `B` to enter bounding box mode
2. Draw rectangle over area to detect
3. Press `B` to exit mode
4. Auto-detect will only search inside box

### Rotation
1. Use rotation controls to adjust image angle
2. Useful for leveling assay plates
3. Apply before drawing shapes

## Support

For issues or questions, check the BUGFIXES_v2.8.1.md document for technical details.

**Version**: 2.8.1 (Image Switching & Shape Preview Fixes)
**Last Updated**: 2025
