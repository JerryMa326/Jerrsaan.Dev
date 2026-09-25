// Pure helpers for the bounded range sliders in SettingsPanel. Kept out of the
// component so the bound-commit rules (odd-only grids, floors, min/max
// ordering) can be unit tested without rendering React.

export interface SliderBoundsRange {
    min: number
    max: number
}

export interface SliderBoundOptions {
    /** Values must land on the odd-integer grid (e.g. OpenCV blur kernel size). */
    oddOnly?: boolean
    /** Non-fractional sliders should not let a fractional bound shift the grid. */
    integer?: boolean
    /** Lowest value a bound may be committed to (default 0, matching the old hard-coded rule). */
    floor?: number
}

export function roundToOdd(n: number): number {
    const r = Math.round(n)
    return r % 2 === 0 ? r + 1 : r
}

export function normalizeBoundValue(raw: number, opts: SliderBoundOptions = {}): number {
    let v = raw
    if (opts.oddOnly) v = Math.max(1, roundToOdd(v))
    else if (opts.integer) v = Math.round(v)
    const floor = opts.floor ?? 0
    return Math.max(floor, v)
}

/**
 * Applies a committed min/max bound edit. Returns null when the edit would
 * make min >= max, which would invert or freeze the slider - callers should
 * keep the previous bounds in that case instead of applying it.
 */
export function applyBoundCommit(
    bounds: SliderBoundsRange,
    key: 'min' | 'max',
    raw: number,
    opts: SliderBoundOptions = {}
): SliderBoundsRange | null {
    const v = normalizeBoundValue(raw, opts)
    const next = { ...bounds, [key]: v }
    if (next.min >= next.max) return null
    return next
}

export function clampValueToBounds(
    value: number,
    bounds: SliderBoundsRange,
    opts: Pick<SliderBoundOptions, 'oddOnly'> = {}
): number {
    const clamped = Math.min(Math.max(value, bounds.min), bounds.max)
    return opts.oddOnly ? roundToOdd(clamped) : clamped
}

/**
 * Widens a range just enough to contain `value`. Used both to seed a slider
 * that mounts with a value already outside its default range (e.g. Max Radius
 * set by crosshair calibration before the settings panel was opened) and to
 * follow values that later arrive from outside the slider.
 */
export function widenBoundsToInclude(bounds: SliderBoundsRange, value: number): SliderBoundsRange {
    if (value >= bounds.min && value <= bounds.max) return bounds
    return { min: Math.min(bounds.min, value), max: Math.max(bounds.max, value) }
}
