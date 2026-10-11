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

export function fitBest(xs: number[], ys: number[]): RegressionModel | null {
    const n = xs.length
    // Power and log only when every point is inside their domain, so all candidates
    // are scored on the same points. Order is simplest first, which wins ties.
    const allXPositive = xs.every(x => x > 0)
    const models = [
        fitLinear(xs, ys),
        allXPositive ? fitLogarithmic(xs, ys) : null,
        allXPositive && ys.every(y => y > 0) ? fitPower(xs, ys) : null,
        n >= 4 ? fitQuadratic(xs, ys) : null
    ].filter(Boolean) as RegressionModel[]

    // Adjusted R^2: R^2 with a small penalty for each extra parameter
    const score = (m: RegressionModel) => {
        const df = n - paramCount(m.type)
        return df > 0 ? 1 - (1 - m.r2) * (n - 1) / df : m.r2
    }
    let best: RegressionModel | null = null
    let bestScore = -Infinity
    for (const m of models) {
        const s = score(m)
        if (s > bestScore + 1e-12) { best = m; bestScore = s }
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

// Use the root inside the standards' range, else the one closest to it (ties go to the larger root)
function pickQuadraticRoot(model: QuadraticModel, x1: number, x2: number): number {
    const lo = model.xMin ?? 0, hi = model.xMax ?? 0
    const dist = (x: number) => Math.max(lo - x, 0, x - hi)
    const [small, large] = x1 <= x2 ? [x1, x2] : [x2, x1]
    return dist(large) <= dist(small) ? large : small
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
            return pickQuadraticRoot(model, x1, x2)
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

// Typical scatter of the standards around the curve, converted from color units to
// concentration using how steep the curve is at x.
export function concentrationUncertainty(model: RegressionModel, x: number, xs: number[], ys: number[]): number | null {
    if (!Number.isFinite(x) || !inDomain(model.type, x)) return null
    const slope = Math.abs(
        model.type === 'linear' ? model.m
            : model.type === 'quadratic' ? 2 * model.a * x + model.b
                : model.type === 'power' ? model.a * model.b * Math.pow(x, model.b - 1)
                    : model.a / x)
    const rse = computeRSE(model, xs, ys)
    if (!Number.isFinite(slope) || slope < 1e-10 || !Number.isFinite(rse)) return null
    return rse / slope
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
    // |standardizedResidual| > 2
    isOutlier: boolean
}

// Residuals over the points inside the model's domain
export function computeResiduals(
    model: RegressionModel,
    points: { label: string; x: number; y: number }[]
): ResidualPoint[] {
    const inside = points.filter(pt => inDomain(model.type, pt.x))
    const n = inside.length
    const p = paramCount(model.type)
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

    const ssRes = residuals.reduce((acc, r) => acc + r.residual ** 2, 0)
    const rse = n > p ? Math.sqrt(ssRes / (n - p)) : 1

    for (const r of residuals) {
        r.standardizedResidual = rse > 0 ? r.residual / rse : 0
        r.isOutlier = Math.abs(r.standardizedResidual) > 2
    }

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

/**
 * Splits spreadsheet clipboard text into cells in reading order (rows on line
 * breaks, cells on tabs). Blank cells are kept as '' so every later value stays
 * lined up with its well; the trailing line break spreadsheets add is ignored.
 */
export function parsePastedCells(text: string): string[] {
    const rows = text.split(/\r\n|\r|\n/)
    if (rows.length > 1 && rows[rows.length - 1] === '') rows.pop()
    return rows.flatMap(row => row.split('\t').map(cell => cell.trim()))
}
