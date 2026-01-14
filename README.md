# ChemClub Analyst

A web-based image analysis tool designed for colorimetric assay detection and regression analysis. Built for chemistry labs to detect, quantify, and analyze color samples in well plates with precision.

## Features

### Detection Studio
- **Image Loading**: Drag-and-drop or click to load multiple images for batch analysis
- **Auto Detection**: Uses OpenCV.js (Hough Transform for circles, contour analysis for rectangles) to automatically detect wells/shapes
- **Manual Adjustment**: Fine-tune detected shapes by dragging, resizing, or deleting
- **Grid View**: View all loaded images in a grid for quick navigation

### Shape Detection Parameters
- **Circle Mode**: Adjust Param1 (edge detection), Param2 (accumulator threshold), min/max radius
- **Rectangle Mode**: Configure min/max area, epsilon (contour approximation accuracy)
- **Sample Area %**: Control what percentage of each shape is used for color sampling (center-focused to avoid edge artifacts)

### Color Analysis
- **RGB/CMYK Modes**: Switch between color spaces for analysis
- **Raw vs Calibrated**: Toggle between raw sensor values and calibrated readings
- **Per-shape color extraction**: Each detected shape displays its average color values

### Regression Studio
- Plot detected color values against known concentrations
- Build calibration curves for quantitative analysis
- Export data for external processing

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Navigate between images |
| `Delete` | Remove selected shape |

## Deployment

```bash
npm run build
```

Output is in `dist/`. Deploy to any static hosting (Netlify, Vercel, GitHub Pages).

## Tech Stack

- **React 19** + TypeScript
- **Vite** for development and bundling
- **Tailwind CSS 4** for styling
- **OpenCV.js** for image processing
- **Chart.js** for data visualization

## Credits

Created by **Hassaan Vani**, **Grady Chen**, and **Jerry Ma**.
