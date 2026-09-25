export type RegressionModelType = 'linear' | 'quadratic' | 'power' | 'logarithmic'

export interface LinearModel { type: 'linear'; m: number; b: number; r2: number }
// xMin/xMax: concentration range of the standards, used to pick the right root when inverting.
// Optional so models cached or exported before it was stored still load.
export interface QuadraticModel { type: 'quadratic'; a: number; b: number; c: number; r2: number; xMin?: number; xMax?: number }
export interface PowerModel { type: 'power'; a: number; b: number; r2: number }
export interface LogarithmicModel { type: 'logarithmic'; a: number; b: number; r2: number }

export type RegressionModel = LinearModel | QuadraticModel | PowerModel | LogarithmicModel

function paramCount(type: RegressionModelType): number {
    return type === 'quadratic' ? 3 : 2
}

// Power and logarithmic models are only defined for x > 0
function inDomain(type: RegressionModelType, x: number): boolean {
    return type === 'linear' || type === 'quadratic' || x > 0
}

function computeR2(actual: number[], predicted: number[]): number {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length
    const ssTot = actual.reduce((acc, y) => acc + (y - mean) ** 2, 0)
    const ssRes = actual.reduce((acc, y, i) => acc + (y - predicted[i]) ** 2, 0)
    return ssTot > 0 ? 1 - ssRes / ssTot : 0
}

export function fitLinear(xs: number[], ys: number[]): LinearModel | null {
    const n = xs.length
    if (n < 2) return null
    let sx = 0, sy = 0, sxy = 0, sxx = 0
    for (let i = 0; i < n; i++) {
        sx += xs[i]; sy += ys[i]; sxy += xs[i] * ys[i]; sxx += xs[i] * xs[i]
    }
    const det = n * sxx - sx * sx
    if (Math.abs(det) < 1e-10) return null
    const m = (n * sxy - sx * sy) / det
    const b = (sy - m * sx) / n
    const predicted = xs.map(x => m * x + b)
    return { type: 'linear', m, b, r2: computeR2(ys, predicted) }
}

export function fitQuadratic(xs: number[], ys: number[]): QuadraticModel | null {
    const n = xs.length
    if (n < 3) return null

    // Normal equations for y = a*x^2 + b*x + c
    // [sum(x^4) sum(x^3) sum(x^2)] [a]   [sum(x^2*y)]
    // [sum(x^3) sum(x^2) sum(x)  ] [b] = [sum(x*y)  ]
    // [sum(x^2) sum(x)   n       ] [c]   [sum(y)     ]
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0
    let sy = 0, sxy = 0, sx2y = 0
    for (let i = 0; i < n; i++) {
        const x = xs[i], y = ys[i]
        const x2 = x * x
        s0 += 1; s1 += x; s2 += x2; s3 += x * x2; s4 += x2 * x2
        sy += y; sxy += x * y; sx2y += x2 * y
    }

    // Gaussian elimination on 3x4 augmented matrix
    const M = [
        [s4, s3, s2, sx2y],
        [s3, s2, s1, sxy],
        [s2, s1, s0, sy]
    ]

    for (let col = 0; col < 3; col++) {
        // Partial pivoting
        let maxRow = col
        for (let row = col + 1; row < 3; row++) {
            if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
        }
        [M[col], M[maxRow]] = [M[maxRow], M[col]]

        if (Math.abs(M[col][col]) < 1e-10) return null

        for (let row = col + 1; row < 3; row++) {
            const factor = M[row][col] / M[col][col]
            for (let j = col; j < 4; j++) {
                M[row][j] -= factor * M[col][j]
            }
        }
    }

    // Back substitution
    const coeffs = [0, 0, 0]
    for (let i = 2; i >= 0; i--) {
        coeffs[i] = M[i][3]
        for (let j = i + 1; j < 3; j++) {
            coeffs[i] -= M[i][j] * coeffs[j]
        }
        coeffs[i] /= M[i][i]
    }

    const [a, b, c] = coeffs
    const predicted = xs.map(x => a * x * x + b * x + c)
    return {
        type: 'quadratic', a, b, c, r2: computeR2(ys, predicted),
        xMin: Math.min(...xs), xMax: Math.max(...xs)
    }
}

export function fitPower(xs: number[], ys: number[]): PowerModel | null {
    // y = a * x^b => ln(y) = ln(a) + b*ln(x)
    const validPairs = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.x > 0 && p.y > 0)
    if (validPairs.length < 2) return null

    const lnX = validPairs.map(p => Math.log(p.x))
    const lnY = validPairs.map(p => Math.log(p.y))

    const linear = fitLinear(lnX, lnY)
    if (!linear) return null

    const a = Math.exp(linear.b)
    const b = linear.m
    // R^2 in original units, over the points the model is defined at (x > 0)
    const domain = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.x > 0)
    const predicted = domain.map(p => a * Math.pow(p.x, b))
    return { type: 'power', a, b, r2: computeR2(domain.map(p => p.y), predicted) }
}

export function fitLogarithmic(xs: number[], ys: number[]): LogarithmicModel | null {
    // y = a*ln(x) + b
    const validPairs = xs.map((x, i) => ({ x, y: ys[i] })).filter(p => p.x > 0)
    if (validPairs.length < 2) return null

    const lnX = validPairs.map(p => Math.log(p.x))
    const validY = validPairs.map(p => p.y)

    const linear = fitLinear(lnX, validY)
    if (!linear) return null

    return { type: 'logarithmic', a: linear.m, b: linear.b, r2: linear.r2 }
}

// Upper 5% critical values of F(1, df) for df = 1..30; beyond that it is ~4
const F_CRIT_05 = [
    161.45, 18.51, 10.13, 7.71, 6.61, 5.99, 5.59, 5.32, 5.12, 4.96,
    4.84, 4.75, 4.67, 4.60, 4.54, 4.49, 4.45, 4.41, 4.38, 4.35,
    4.32, 4.30, 4.28, 4.26, 4.24, 4.23, 4.21, 4.20, 4.18, 4.17
]

export function fitBest(xs: number[], ys: number[]): RegressionModel | null {
    const n = xs.length
    const sse = (model: RegressionModel) =>
        xs.reduce((acc, x, i) => acc + (ys[i] - evaluateModel(model, x)) ** 2, 0)

    // Two-parameter candidates, scored on the SAME points. Power and log only
    // qualify when every point is inside their domain.
    const allXPositive = xs.every(x => x > 0)
    const twoParam = [
        fitLinear(xs, ys),
        allXPositive ? fitLogarithmic(xs, ys) : null,
        allXPositive && ys.every(y => y > 0) ? fitPower(xs, ys) : null
    ].filter(Boolean) as RegressionModel[]

    let best: RegressionModel | null = null
    let bestSSE = Infinity
    for (const m of twoParam) {
        const s = sse(m)
        // Equal parameter counts, so the smaller residual wins; ties go to the simpler form listed first
        if (Number.isFinite(s) && s < bestSSE * (1 - 1e-9)) { best = m; bestSSE = s }
    }

    // Quadratic always fits at least as well as linear (it contains it), so it has to
    // earn its extra parameter: keep it only when the drop in residual is significant
    // at the 5% level (partial F-test with 1 and n - 3 degrees of freedom).
    const quad = n >= 4 ? fitQuadratic(xs, ys) : null
    if (quad) {
        const quadSSE = sse(quad)
        const df = n - 3
        const fCrit = F_CRIT_05[df - 1] ?? 3.84
        const scale = ys.reduce((acc, y) => acc + y * y, 0)
        const exact = quadSSE <= 1e-20 * scale
        const f = exact ? Infinity : (bestSSE - quadSSE) / (quadSSE / df)
        const bestIsExact = best !== null && bestSSE <= 1e-20 * scale
        if (!best || (!bestIsExact && f > fCrit)) best = quad
    }

    return best
}

export function evaluateModel(model: RegressionModel, x: number): number {
    switch (model.type) {
        case 'linear': return model.m * x + model.b
        case 'quadratic': return model.a * x * x + model.b * x + model.c
        case 'power': return x > 0 ? model.a * Math.pow(x, model.b) : NaN
        case 'logarithmic': return x > 0 ? model.a * Math.log(x) + model.b : NaN
    }
}

function pickQuadraticRoot(model: QuadraticModel, roots: [number, number]): number | null {
    const [lo, hi] = roots[0] <= roots[1] ? roots : [roots[1], roots[0]]
    const vertex = -model.b / (2 * model.a)
    const { xMin, xMax } = model
    if (xMin === undefined || xMax === undefined) {
        // Older saved models have no range. Standards are at x >= 0, so when the
        // vertex is at or left of 0 the data is on the right-hand branch.
        if (vertex <= 0) return hi
        if (lo >= 0) return lo
        return hi >= 0 ? hi : null
    }
    const inRange = (r: number) => r >= xMin && r <= xMax
    // The branch of the parabola that holds most of the calibration range
    const dataOnRight = xMax - vertex >= vertex - xMin
    if (inRange(lo) && inRange(hi)) return dataOnRight ? hi : lo
    if (inRange(lo)) return lo
    if (inRange(hi)) return hi
    // Extrapolating: follow the branch that holds most of the calibration range. When the
    // vertex sits in the middle of the range neither branch is the data's, so give up.
    if (xMax - vertex === vertex - xMin) return null
    return dataOnRight ? hi : lo
}

export function predict(model: RegressionModel, colorValue: number): number | null {
    // Inverse prediction: given y (color value), find x (concentration)
    switch (model.type) {
        case 'linear': {
            if (Math.abs(model.m) < 1e-10) return null
            return (colorValue - model.b) / model.m
        }
        case 'quadratic': {
            // a*x^2 + b*x + (c - colorValue) = 0
            const { a, b, c } = model
            if (Math.abs(a) < 1e-10) return Math.abs(b) > 1e-10 ? (colorValue - c) / b : null
            const disc = b * b - 4 * a * (c - colorValue)
            if (disc < 0) return null
            const x1 = (-b + Math.sqrt(disc)) / (2 * a)
            const x2 = (-b - Math.sqrt(disc)) / (2 * a)
            return pickQuadraticRoot(model, [x1, x2])
        }
        case 'power': {
            // colorValue = a * x^b => x = (colorValue/a)^(1/b)
            if (model.a <= 0 || Math.abs(model.b) < 1e-10) return null
            const ratio = colorValue / model.a
            if (ratio <= 0) return null
            return Math.pow(ratio, 1 / model.b)
        }
        case 'logarithmic': {
            // colorValue = a*ln(x) + b => ln(x) = (colorValue - b)/a => x = exp(...)
            if (Math.abs(model.a) < 1e-10) return null
            return Math.exp((colorValue - model.b) / model.a)
        }
    }
}

/**
 * Every model is an ordinary least-squares fit of z on a design row: y on [1, x] (linear),
 * y on [1, x, x^2] (quadratic), y on [1, ln x] (logarithmic), ln y on [1, ln x] (power).
 * Returns the design row for x, or null where the point cannot be part of the fit.
 */
function fittedSpace(type: RegressionModelType, x: number, y: number): { row: number[]; z: number } | null {
    switch (type) {
        case 'linear': return { row: [1, x], z: y }
        case 'quadratic': return { row: [1, x, x * x], z: y }
        case 'logarithmic': return x > 0 ? { row: [1, Math.log(x)], z: y } : null
        case 'power': return x > 0 && y > 0 ? { row: [1, Math.log(x)], z: Math.log(y) } : null
    }
}

// (X'X)^-1 for design matrix rows, by Gauss-Jordan with partial pivoting; null if singular
function invertGram(rows: number[][]): number[][] | null {
    const p = rows[0]?.length ?? 0
    const A = Array.from({ length: p }, (_, i) =>
        Array.from({ length: 2 * p }, (_, j) =>
            j < p ? rows.reduce((acc, r) => acc + r[i] * r[j], 0) : (j - p === i ? 1 : 0)))
    for (let col = 0; col < p; col++) {
        let maxRow = col
        for (let row = col + 1; row < p; row++) {
            if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row
        }
        [A[col], A[maxRow]] = [A[maxRow], A[col]]
        const pivot = A[col][col]
        if (Math.abs(pivot) < 1e-12) return null
        for (let j = 0; j < 2 * p; j++) A[col][j] /= pivot
        for (let row = 0; row < p; row++) {
            if (row === col) continue
            const factor = A[row][col]
            for (let j = 0; j < 2 * p; j++) A[row][j] -= factor * A[col][j]
        }
    }
    return A.map(r => r.slice(p))
}

// u' M v
function quadForm(u: number[], M: number[][], v: number[]): number {
    let acc = 0
    for (let i = 0; i < u.length; i++) for (let j = 0; j < v.length; j++) acc += u[i] * M[i][j] * v[j]
    return acc
}

/**
 * Standard error of a concentration read off the curve at x, from the standards (xs, ys)
 * the curve was fitted to. It is the classic inverse-prediction error: the scatter of a
 * new reading plus the uncertainty of the fitted curve itself at x,
 * s * sqrt(1 + g'(X'X)^-1 g) / |slope|, worked out where the model is a straight-line
 * least-squares fit (ln y and ln x for power, ln x for logarithmic) and carried back to
 * concentration. For linear this is (s/|m|) * sqrt(1 + 1/n + (x - xbar)^2 / Sxx).
 * Returns null where the curve is flat or undefined, or there are too few standards.
 */
export function concentrationUncertainty(model: RegressionModel, x: number, xs: number[], ys: number[]): number | null {
    if (!Number.isFinite(x) || !inDomain(model.type, x)) return null
    const pts = xs.map((xi, i) => fittedSpace(model.type, xi, ys[i])).filter(Boolean) as { row: number[]; z: number }[]
    const p = paramCount(model.type)
    if (pts.length <= p) return null
    const inv = invertGram(pts.map(pt => pt.row))
    if (!inv) return null

    // Model prediction and slope in the space it was fitted in (u = x or ln x)
    const zHat = (row: number[]): number => {
        switch (model.type) {
            case 'linear': return model.b + model.m * row[1]
            case 'quadratic': return model.c + model.b * row[1] + model.a * row[2]
            case 'logarithmic': return model.b + model.a * row[1]
            case 'power': return Math.log(model.a) + model.b * row[1]
        }
    }
    const slope = Math.abs(
        model.type === 'linear' ? model.m
            : model.type === 'quadratic' ? 2 * model.a * x + model.b
                : model.type === 'logarithmic' ? model.a
                    : model.b)
    const ssRes = pts.reduce((acc, pt) => acc + (pt.z - zHat(pt.row)) ** 2, 0)
    const s = Math.sqrt(ssRes / (pts.length - p))
    if (!Number.isFinite(slope) || slope < 1e-10 || !Number.isFinite(s)) return null

    const g = fittedSpace(model.type, x, 1)!.row
    const sigmaU = s * Math.sqrt(1 + Math.max(0, quadForm(g, inv, g))) / slope
    // Log-x models: d(ln x) = dx / x
    const sigma = model.type === 'power' || model.type === 'logarithmic' ? x * sigmaU : sigmaU
    return Number.isFinite(sigma) ? sigma : null
}

export function computeRSE(model: RegressionModel, xs: number[], actuals: number[]): number {
    const inside = xs.map((x, i) => ({ x, y: actuals[i] })).filter(p => inDomain(model.type, p.x))
    const n = inside.length
    const p = paramCount(model.type)
    if (n <= p) return Infinity
    const ssRes = inside.reduce((acc, pt) => acc + (pt.y - evaluateModel(model, pt.x)) ** 2, 0)
    return Math.sqrt(ssRes / (n - p))
}

export interface ResidualPoint {
    label: string
    concentration: number
    observed: number
    predicted: number
    residual: number
    standardizedResidual: number
    // Beyond the outlier cutoff for this many standards (see outlierCutoff)
    isOutlier: boolean
}

/**
 * Two-sided tail P(|T| > t) of Student's t with integer df, from the closed forms in
 * Abramowitz & Stegun 26.7.3 / 26.7.4.
 */
function studentTTail(t: number, df: number): number {
    const theta = Math.atan(Math.abs(t) / Math.sqrt(df))
    const c2 = Math.cos(theta) ** 2
    let sum = 1, term = 1
    if (df % 2 === 1) {
        for (let k = 2; k <= df - 3; k += 2) { term *= k / (k + 1) * c2; sum += term }
        const inner = df === 1 ? theta : theta + Math.sin(theta) * Math.cos(theta) * sum
        return 1 - (2 / Math.PI) * inner
    }
    for (let k = 1; k <= df - 3; k += 2) { term *= k / (k + 1) * c2; sum += term }
    return 1 - Math.sin(theta) * sum
}

/** Critical value t with P(|T| > t) = alpha for Student's t with integer df >= 1. */
export function studentTCritical(alpha: number, df: number): number {
    let lo = 0, hi = 1
    while (studentTTail(hi, df) > alpha && hi < 1e12) hi *= 2
    for (let i = 0; i < 200 && hi - lo > 1e-12 * hi; i++) {
        const mid = (lo + hi) / 2
        if (studentTTail(mid, df) > alpha) lo = mid; else hi = mid
    }
    return (lo + hi) / 2
}

/**
 * |studentized residual| above which a standard is called an outlier, for n standards and
 * a model with p parameters: the Bonferroni-corrected 5% test, t_{1 - 0.05/(2n), n - p - 1}.
 * A fixed cutoff such as 2 would flag a good standard in most small calibrations just by
 * chance, since each of the n points gets its own try. Infinity when there are too few
 * standards to judge.
 */
export function outlierCutoff(n: number, p: number): number {
    const df = n - p - 1
    if (df < 1) return Infinity
    return studentTCritical(0.05 / n, df)
}

/**
 * Residuals over the points inside the model's domain, in the units of the plot.
 * standardizedResidual is the externally studentized (deleted) residual
 * t_i = e_i / (s_(i) * sqrt(1 - h_ii)), so a single bad standard is not able to hide itself
 * by inflating the error estimate. It is worked out in the space the model is a least-squares
 * fit in (ln y vs ln x for power), where the deleted-variance shortcut is exact, and from a
 * fresh fit of these points so it never mixes a stale curve with new data.
 */
export function computeResiduals(
    model: RegressionModel,
    points: { label: string; x: number; y: number }[]
): ResidualPoint[] {
    const inside = points.filter(pt => inDomain(model.type, pt.x))
    const residuals = inside.map(pt => {
        const predicted = evaluateModel(model, pt.x)
        return {
            label: pt.label,
            concentration: pt.x,
            observed: pt.y,
            predicted,
            residual: pt.y - predicted,
            standardizedResidual: 0,
            isOutlier: false
        }
    })

    // Points that are part of the least-squares fit (power needs y > 0 as well)
    const fitted = inside
        .map((pt, i) => ({ i, f: fittedSpace(model.type, pt.x, pt.y) }))
        .filter(e => e.f !== null) as { i: number; f: { row: number[]; z: number } }[]
    const n = fitted.length
    const p = paramCount(model.type)
    const cutoff = outlierCutoff(n, p)
    // The deleted variance needs at least one degree of freedom left after dropping a point
    if (!Number.isFinite(cutoff)) return residuals

    const rows = fitted.map(e => e.f.row)
    const inv = invertGram(rows)
    if (!inv) return residuals
    const xtz = Array.from({ length: p }, (_, j) => fitted.reduce((acc, e) => acc + e.f.row[j] * e.f.z, 0))
    const beta = inv.map(r => r.reduce((acc, v, j) => acc + v * xtz[j], 0))
    const e = fitted.map(({ f }) => f.z - f.row.reduce((acc, v, j) => acc + v * beta[j], 0))
    const h = rows.map(r => quadForm(r, inv, r))

    const ssRes = e.reduce((acc, v) => acc + v * v, 0)
    const tiny = 1e-12 * (ssRes + fitted.reduce((acc, { f }) => acc + f.z * f.z, 0))
    fitted.forEach(({ i }, k) => {
        const r = residuals[i]
        const oneMinusH = 1 - h[k]
        if (oneMinusH <= 1e-10) return
        const deletedSSE = ssRes - e[k] ** 2 / oneMinusH
        // Below zero is rounding error, not a sign the other points are exact: no verdict
        if (deletedSSE < -tiny) return
        if (deletedSSE <= tiny) {
            // Every other point sits exactly on the curve
            r.standardizedResidual = e[k] ** 2 > tiny ? Math.sign(e[k]) * Infinity : 0
        } else {
            r.standardizedResidual = e[k] / (Math.sqrt(deletedSSE / (n - p - 1)) * Math.sqrt(oneMinusH))
        }
        r.isOutlier = Math.abs(r.standardizedResidual) > cutoff
    })

    return residuals
}

export function formatEquation(model: RegressionModel): string {
    switch (model.type) {
        case 'linear':
            return `y = ${model.m.toFixed(2)}x + ${model.b.toFixed(1)}`
        case 'quadratic':
            return `y = ${model.a.toFixed(3)}x² + ${model.b.toFixed(2)}x + ${model.c.toFixed(1)}`
        case 'power':
            return `y = ${model.a.toFixed(2)}·x^${model.b.toFixed(2)}`
        case 'logarithmic':
            return `y = ${model.a.toFixed(2)}·ln(x) + ${model.b.toFixed(1)}`
    }
}
