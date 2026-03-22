/** Minimal OpenCV.js type declarations for the subset of API used by this project */

interface OpenCVMat {
    delete(): void
    cols: number
    rows: number
    data32F: Float32Array
    convertTo(dst: OpenCVMat, rtype: number, alpha?: number, beta?: number): void
}

interface OpenCVMatVector {
    delete(): void
    size(): number
    get(index: number): OpenCVMat
}

interface OpenCVSize {
    width: number
    height: number
}

interface OpenCVCLAHE {
    apply(src: OpenCVMat, dst: OpenCVMat): void
    delete(): void
}

interface OpenCVRect {
    x: number
    y: number
    width: number
    height: number
}

interface OpenCV {
    Mat: new () => OpenCVMat
    MatVector: new () => OpenCVMatVector
    Size: new (width: number, height: number) => OpenCVSize
    CLAHE: new (clipLimit: number, tileGridSize: OpenCVSize) => OpenCVCLAHE

    imread(canvas: HTMLCanvasElement): OpenCVMat
    imshow(canvas: HTMLCanvasElement, mat: OpenCVMat): void
    cvtColor(src: OpenCVMat, dst: OpenCVMat, code: number): void
    GaussianBlur(src: OpenCVMat, dst: OpenCVMat, ksize: OpenCVSize, sigmaX: number, sigmaY?: number): void
    HoughCircles(
        image: OpenCVMat, circles: OpenCVMat, method: number,
        dp: number, minDist: number, param1: number, param2: number,
        minRadius: number, maxRadius: number
    ): void
    Canny(src: OpenCVMat, dst: OpenCVMat, threshold1: number, threshold2: number): void
    findContours(
        image: OpenCVMat, contours: OpenCVMatVector, hierarchy: OpenCVMat,
        mode: number, method: number
    ): void
    contourArea(contour: OpenCVMat): number
    arcLength(contour: OpenCVMat, closed: boolean): number
    approxPolyDP(curve: OpenCVMat, approxCurve: OpenCVMat, epsilon: number, closed: boolean): void
    boundingRect(points: OpenCVMat): OpenCVRect
    addWeighted(
        src1: OpenCVMat, alpha: number, src2: OpenCVMat, beta: number,
        gamma: number, dst: OpenCVMat
    ): void

    // Constants
    COLOR_RGBA2GRAY: number
    COLOR_GRAY2RGBA: number
    HOUGH_GRADIENT: number
    RETR_EXTERNAL: number
    CHAIN_APPROX_SIMPLE: number
}

interface Window {
    cv: OpenCV | undefined
}
