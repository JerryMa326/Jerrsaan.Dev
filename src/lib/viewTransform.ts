// Mapping between canvas (screen) pixels and image pixels in the image viewer.
// The pan offset is in screen pixels, so it is applied before rotation: a
// horizontal drag moves the photo horizontally whatever its rotation.

export interface ViewTransform {
    canvasWidth: number
    canvasHeight: number
    imageWidth: number
    imageHeight: number
    zoom: number
    rotation: number // degrees
    offset: { x: number; y: number }
}

/** Set up ctx so that drawing in image coordinates lands where the viewer shows the image. */
export function applyViewTransform(ctx: CanvasRenderingContext2D, t: ViewTransform) {
    ctx.translate(t.canvasWidth / 2 + t.offset.x, t.canvasHeight / 2 + t.offset.y)
    ctx.rotate((t.rotation * Math.PI) / 180)
    ctx.scale(t.zoom, t.zoom)
    ctx.translate(-t.imageWidth / 2, -t.imageHeight / 2)
}

/** Inverse of applyViewTransform: canvas pixel -> image pixel. */
export function screenToImage(pt: { x: number; y: number }, t: ViewTransform) {
    const x = pt.x - t.canvasWidth / 2 - t.offset.x
    const y = pt.y - t.canvasHeight / 2 - t.offset.y

    const rad = (-t.rotation * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const rx = x * cos - y * sin
    const ry = x * sin + y * cos

    return {
        x: rx / t.zoom + t.imageWidth / 2,
        y: ry / t.zoom + t.imageHeight / 2
    }
}
