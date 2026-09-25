import { describe, it, expect } from 'vitest'
import {
    fitLinear,
    fitQuadratic,
    fitPower,
    fitLogarithmic,
    fitBest,
    evaluateModel,
    predict,
    formatEquation,
    computeRSE,
    computeResiduals,
    concentrationUncertainty,
} from '@/lib/regressionUtils'
import type { LinearModel, QuadraticModel, PowerModel, LogarithmicModel } from '@/lib/regressionUtils'

// ─── fitLinear ──────────────────────────────────────────────────────────────────

describe('fitLinear', () => {
    it('returns correct m, b, r2 for a normal dataset', () => {
        // y = 2x + 1
        const xs = [1, 2, 3, 4, 5]
        const ys = [3, 5, 7, 9, 11]
        const model = fitLinear(xs, ys)!
        expect(model).not.toBeNull()
        expect(model.type).toBe('linear')
        expect(model.m).toBeCloseTo(2, 10)
        expect(model.b).toBeCloseTo(1, 10)
        expect(model.r2).toBeCloseTo(1, 10)
    })

    it('returns r2 = 1 for a perfect linear fit', () => {
        const xs = [0, 10]
        const ys = [5, 25]
        const model = fitLinear(xs, ys)!
        expect(model.r2).toBeCloseTo(1, 10)
    })

    it('returns null when fewer than 2 points are given', () => {
        expect(fitLinear([], [])).toBeNull()
        expect(fitLinear([1], [2])).toBeNull()
    })

    it('returns null for a vertical line (all x values equal)', () => {
        const xs = [3, 3, 3]
        const ys = [1, 2, 3]
        expect(fitLinear(xs, ys)).toBeNull()
    })
})

// ─── fitQuadratic ───────────────────────────────────────────────────────────────

describe('fitQuadratic', () => {
    it('fits a perfect parabola with r2 near 1', () => {
        // y = x^2
        const xs = [0, 1, 2, 3, 4]
        const ys = xs.map(x => x * x)
        const model = fitQuadratic(xs, ys)!
        expect(model).not.toBeNull()
        expect(model.type).toBe('quadratic')
        expect(model.a).toBeCloseTo(1, 5)
        expect(model.b).toBeCloseTo(0, 5)
        expect(model.c).toBeCloseTo(0, 5)
        expect(model.r2).toBeCloseTo(1, 5)
    })

    it('fits y = 2x^2 + 3x + 1', () => {
        const xs = [-2, -1, 0, 1, 2, 3]
        const ys = xs.map(x => 2 * x * x + 3 * x + 1)
        const model = fitQuadratic(xs, ys)!
        expect(model.a).toBeCloseTo(2, 5)
        expect(model.b).toBeCloseTo(3, 5)
        expect(model.c).toBeCloseTo(1, 5)
        expect(model.r2).toBeCloseTo(1, 5)
    })

    it('returns null when fewer than 3 points are given', () => {
        expect(fitQuadratic([], [])).toBeNull()
        expect(fitQuadratic([1], [1])).toBeNull()
        expect(fitQuadratic([1, 2], [1, 4])).toBeNull()
    })
})

// ─── fitPower ───────────────────────────────────────────────────────────────────

describe('fitPower', () => {
    it('fits a power model with positive x and y', () => {
        // y = 2 * x^3
        const xs = [1, 2, 3, 4, 5]
        const ys = xs.map(x => 2 * Math.pow(x, 3))
        const model = fitPower(xs, ys)!
        expect(model).not.toBeNull()
        expect(model.type).toBe('power')
        expect(model.a).toBeCloseTo(2, 2)
        expect(model.b).toBeCloseTo(3, 2)
        expect(model.r2).toBeCloseTo(1, 2)
    })

    it('returns null when all x values are zero or negative', () => {
        expect(fitPower([0, 0], [1, 2])).toBeNull()
        expect(fitPower([-1, -2], [1, 2])).toBeNull()
    })

    it('returns null when all y values are zero or negative', () => {
        expect(fitPower([1, 2], [0, 0])).toBeNull()
        expect(fitPower([1, 2], [-1, -2])).toBeNull()
    })

    it('returns null when fewer than 2 valid positive pairs exist', () => {
        expect(fitPower([1], [1])).toBeNull()
    })
})

// ─── fitLogarithmic ─────────────────────────────────────────────────────────────

describe('fitLogarithmic', () => {
    it('fits a logarithmic model with positive x values', () => {
        // y = 5 * ln(x) + 3
        const xs = [1, 2, 3, 4, 5, 6]
        const ys = xs.map(x => 5 * Math.log(x) + 3)
        const model = fitLogarithmic(xs, ys)!
        expect(model).not.toBeNull()
        expect(model.type).toBe('logarithmic')
        expect(model.a).toBeCloseTo(5, 5)
        expect(model.b).toBeCloseTo(3, 5)
        expect(model.r2).toBeCloseTo(1, 5)
    })

    it('returns null when all x values are <= 0', () => {
        expect(fitLogarithmic([0, -1, -2], [1, 2, 3])).toBeNull()
    })

    it('returns null when fewer than 2 valid points', () => {
        expect(fitLogarithmic([1], [5])).toBeNull()
    })
})

// ─── fitBest ────────────────────────────────────────────────────────────────────

describe('fitBest', () => {
    it('selects the model with the highest R2', () => {
        // Perfect quadratic data: quadratic should win
        const xs = [0, 1, 2, 3, 4]
        const ys = [0, 1, 4, 9, 16]
        const model = fitBest(xs, ys)!
        expect(model).not.toBeNull()
        expect(model.r2).toBeGreaterThanOrEqual(0.99)
    })

    it('returns null when no models can be fit', () => {
        expect(fitBest([], [])).toBeNull()
    })

    it('selects linear for perfect linear data', () => {
        const xs = [1, 2, 3, 4, 5]
        const ys = [2, 4, 6, 8, 10]
        const model = fitBest(xs, ys)!
        expect(model).not.toBeNull()
        // All models should fit perfectly; any type with r2=1 is acceptable
        expect(model.r2).toBeCloseTo(1, 5)
    })
})

// ─── evaluateModel ──────────────────────────────────────────────────────────────

describe('evaluateModel', () => {
    it('evaluates a linear model', () => {
        const model: LinearModel = { type: 'linear', m: 3, b: 2, r2: 1 }
        expect(evaluateModel(model, 5)).toBeCloseTo(17)
    })

    it('evaluates a quadratic model', () => {
        const model: QuadraticModel = { type: 'quadratic', a: 1, b: -2, c: 3, r2: 1 }
        // 1*4 + (-2)*2 + 3 = 3
        expect(evaluateModel(model, 2)).toBeCloseTo(3)
    })

    it('evaluates a power model', () => {
        const model: PowerModel = { type: 'power', a: 2, b: 3, r2: 1 }
        // 2 * 3^3 = 54
        expect(evaluateModel(model, 3)).toBeCloseTo(54)
    })

    it('evaluates a power model with x <= 0 returning NaN (outside its domain)', () => {
        const model: PowerModel = { type: 'power', a: 2, b: 3, r2: 1 }
        expect(evaluateModel(model, 0)).toBeNaN()
        expect(evaluateModel(model, -1)).toBeNaN()
    })

    it('evaluates a logarithmic model', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 5, b: 10, r2: 1 }
        // 5 * ln(e) + 10 = 15
        expect(evaluateModel(model, Math.E)).toBeCloseTo(15)
    })

    it('evaluates a logarithmic model with x <= 0 returning NaN (outside its domain)', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 5, b: 10, r2: 1 }
        expect(evaluateModel(model, 0)).toBeNaN()
        expect(evaluateModel(model, -1)).toBeNaN()
    })
})

// ─── predict (inverse) ─────────────────────────────────────────────────────────

describe('predict', () => {
    it('inverts a linear model', () => {
        const model: LinearModel = { type: 'linear', m: 2, b: 5, r2: 1 }
        // y = 2x + 5 => x = (y - 5) / 2
        expect(predict(model, 11)).toBeCloseTo(3)
    })

    it('returns null for linear model with m = 0', () => {
        const model: LinearModel = { type: 'linear', m: 0, b: 5, r2: 1 }
        expect(predict(model, 5)).toBeNull()
    })

    it('inverts a quadratic model', () => {
        const model: QuadraticModel = { type: 'quadratic', a: 1, b: 0, c: 0, r2: 1 }
        // y = x^2, solving for y=9 => x=3
        expect(predict(model, 9)).toBeCloseTo(3)
    })

    it('returns null for quadratic with negative discriminant', () => {
        const model: QuadraticModel = { type: 'quadratic', a: 1, b: 0, c: 10, r2: 1 }
        // y = x^2 + 10 => disc = 0 - 4*(10-5) = -20 < 0
        expect(predict(model, 5)).toBeNull()
    })

    it('inverts a power model', () => {
        const model: PowerModel = { type: 'power', a: 2, b: 3, r2: 1 }
        // y = 2*x^3, x = (y/2)^(1/3)
        const y = 2 * Math.pow(4, 3) // 128
        expect(predict(model, y)).toBeCloseTo(4)
    })

    it('returns null for power model with invalid parameters', () => {
        const model: PowerModel = { type: 'power', a: 0, b: 3, r2: 1 }
        expect(predict(model, 5)).toBeNull()
    })

    it('inverts a logarithmic model', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 2, b: 1, r2: 1 }
        // y = 2*ln(x) + 1 => ln(x) = (y-1)/2 => x = exp((y-1)/2)
        const y = 2 * Math.log(10) + 1
        expect(predict(model, y)).toBeCloseTo(10)
    })

    it('returns null for logarithmic model with a = 0', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 0, b: 5, r2: 1 }
        expect(predict(model, 5)).toBeNull()
    })

    it('round-trip: evaluate then predict back for linear', () => {
        const model: LinearModel = { type: 'linear', m: 3.5, b: -2, r2: 1 }
        const x = 7
        const y = evaluateModel(model, x)
        expect(predict(model, y)).toBeCloseTo(x)
    })

    it('round-trip: evaluate then predict back for power', () => {
        const model: PowerModel = { type: 'power', a: 1.5, b: 2.5, r2: 1 }
        const x = 3
        const y = evaluateModel(model, x)
        expect(predict(model, y)).toBeCloseTo(x)
    })

    it('round-trip: evaluate then predict back for logarithmic', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 4, b: -3, r2: 1 }
        const x = 5
        const y = evaluateModel(model, x)
        expect(predict(model, y)).toBeCloseTo(x)
    })
})

// ─── formatEquation ─────────────────────────────────────────────────────────────

describe('formatEquation', () => {
    it('formats a linear equation', () => {
        const model: LinearModel = { type: 'linear', m: 2.345, b: 1.6, r2: 0.99 }
        const eq = formatEquation(model)
        expect(eq).toContain('y =')
        expect(eq).toContain('x')
        expect(eq).toBe('y = 2.35x + 1.6')
    })

    it('formats a quadratic equation', () => {
        const model: QuadraticModel = { type: 'quadratic', a: 1.2345, b: -3.45, c: 7.8, r2: 0.99 }
        const eq = formatEquation(model)
        expect(eq).toContain('x\u00B2')
        expect(eq).toBe('y = 1.234x\u00B2 + -3.45x + 7.8')
    })

    it('formats a power equation', () => {
        const model: PowerModel = { type: 'power', a: 2.5, b: 0.75, r2: 0.99 }
        const eq = formatEquation(model)
        expect(eq).toContain('x^')
        expect(eq).toBe('y = 2.50\u00B7x^0.75')
    })

    it('formats a logarithmic equation', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 3.14, b: 2.7, r2: 0.99 }
        const eq = formatEquation(model)
        expect(eq).toContain('ln(x)')
        expect(eq).toBe('y = 3.14\u00B7ln(x) + 2.7')
    })
})

// ─── computeRSE ─────────────────────────────────────────────────────────────────

describe('computeRSE', () => {
    it('returns 0 for a perfect linear fit', () => {
        const model: LinearModel = { type: 'linear', m: 2, b: 1, r2: 1 }
        expect(computeRSE(model, [1, 2, 3], [3, 5, 7])).toBeCloseTo(0)
    })

    it('returns Infinity when n <= p', () => {
        const model: LinearModel = { type: 'linear', m: 2, b: 1, r2: 1 }
        expect(computeRSE(model, [1], [3])).toBe(Infinity)
    })

    it('returns positive value for imperfect fit', () => {
        const model: LinearModel = { type: 'linear', m: 1, b: 0, r2: 0.9 }
        const rse = computeRSE(model, [1, 2, 3, 4], [1.1, 1.9, 3.2, 3.8])
        expect(rse).toBeGreaterThan(0)
        expect(rse).toBeLessThan(1)
    })
})

// ─── computeResiduals ───────────────────────────────────────────────────────────

describe('computeResiduals', () => {
    it('computes zero residuals for a perfect fit', () => {
        const model: LinearModel = { type: 'linear', m: 2, b: 1, r2: 1 }
        const points = [
            { label: 'a', x: 1, y: 3 },
            { label: 'b', x: 2, y: 5 },
            { label: 'c', x: 3, y: 7 }
        ]
        const result = computeResiduals(model, points)
        expect(result).toHaveLength(3)
        result.forEach(r => {
            expect(r.residual).toBeCloseTo(0)
            expect(r.standardizedResidual).toBeCloseTo(0)
        })
    })

    it('flags an outlier with |stdResidual| > 2', () => {
        const model: LinearModel = { type: 'linear', m: 1, b: 0, r2: 0.9 }
        const points = [
            { label: 'a', x: 1, y: 1 },
            { label: 'b', x: 2, y: 2 },
            { label: 'c', x: 3, y: 3 },
            { label: 'd', x: 4, y: 4 },
            { label: 'e', x: 5, y: 5 },
            { label: 'f', x: 6, y: 6 },
            { label: 'g', x: 7, y: 50 }
        ]
        const result = computeResiduals(model, points)
        const outlier = result.find(r => r.label === 'g')!
        expect(Math.abs(outlier.standardizedResidual)).toBeGreaterThan(2)
    })

    it('returns correct structure', () => {
        const model: LinearModel = { type: 'linear', m: 1, b: 0, r2: 1 }
        const points = [{ label: 'a', x: 1, y: 1.5 }, { label: 'b', x: 2, y: 2 }, { label: 'c', x: 3, y: 3 }]
        const result = computeResiduals(model, points)
        expect(result[0]).toHaveProperty('label')
        expect(result[0]).toHaveProperty('concentration')
        expect(result[0]).toHaveProperty('observed')
        expect(result[0]).toHaveProperty('predicted')
        expect(result[0]).toHaveProperty('residual')
        expect(result[0]).toHaveProperty('standardizedResidual')
    })
})

// ─── Model selection, domains, outliers, inverse prediction ────────────────────

// Seeded PRNG so the model-selection trials are deterministic
function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
function gaussian(rand: () => number) {
    return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
}

describe('fitBest model selection', () => {
    it('picks linear for truly linear noisy data in the vast majority of trials', () => {
        const rand = mulberry32(42)
        for (const xs of [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0.5, 1, 2, 4, 8, 16]]) {
            let linearWins = 0
            const trials = 1000
            for (let t = 0; t < trials; t++) {
                const ys = xs.map(x => 200 - 12 * x + 3 * gaussian(rand))
                if (fitBest(xs, ys)!.type === 'linear') linearWins++
            }
            expect(linearWins / trials).toBeGreaterThan(0.9)
        }
    })

    it('still picks quadratic for clearly curved data', () => {
        const rand = mulberry32(7)
        const xs = [0, 1, 2, 3, 4, 5]
        let quadWins = 0
        const trials = 200
        for (let t = 0; t < trials; t++) {
            const ys = xs.map(x => 220 - 60 * x + 6 * x * x + 1.5 * gaussian(rand))
            if (fitBest(xs, ys)!.type === 'quadratic') quadWins++
        }
        expect(quadWins / trials).toBeGreaterThan(0.95)
        expect(fitBest([0, 1, 2, 3, 4], [0, 1, 4, 9, 16])!.type).toBe('quadratic')
    })

    it('only considers power/log when every point is inside their domain', () => {
        // A blank standard at x = 0 rules out power and logarithmic
        const xs = [0, 1, 2, 3, 4, 5]
        const ys = [5, 100, 130, 150, 160, 170]
        const type = fitBest(xs, ys)!.type
        expect(type === 'linear' || type === 'quadratic').toBe(true)
    })
})

describe('power / logarithmic outside their domain', () => {
    const xs = [0, 1, 2, 3, 4, 5]
    const ys = [200, 180, 160, 140, 120, 100]

    it('computes R2 only over points the model can describe', () => {
        expect(fitPower(xs, ys)!.r2).toBeGreaterThan(0.8)
        expect(fitLogarithmic(xs, ys)!.r2).toBeGreaterThan(0.8)
    })

    it('evaluateModel returns NaN at x <= 0', () => {
        expect(evaluateModel(fitPower(xs, ys)!, 0)).toBeNaN()
        expect(evaluateModel(fitLogarithmic(xs, ys)!, -1)).toBeNaN()
    })

    it('RSE and residuals leave out the blank instead of counting its full value', () => {
        const power = fitPower(xs, ys)!
        expect(computeRSE(power, xs, ys)).toBeLessThan(20)
        const residuals = computeResiduals(power, xs.map((x, i) => ({ label: `p${i}`, x, y: ys[i] })))
        expect(residuals.map(r => r.label)).not.toContain('p0')
        residuals.forEach(r => expect(Number.isFinite(r.residual)).toBe(true))
    })
})

describe('computeResiduals outlier flag', () => {
    it('flags a gross outlier in a 6-point linear calibration', () => {
        const xs = [0, 1, 2, 3, 4, 5]
        const ys = [200, 190, 100, 170, 160, 150]
        const model = fitLinear(xs, ys)!
        const residuals = computeResiduals(model, xs.map((x, i) => ({ label: `x${x}`, x, y: ys[i] })))
        const flagged = residuals.filter(r => Math.abs(r.standardizedResidual) > 2).map(r => r.label)
        expect(flagged).toEqual(['x2'])
    })

    it('does not flag anything on clean noisy data', () => {
        const xs = [0, 1, 2, 3, 4, 5]
        const ys = [200.5, 189.2, 180.9, 169.4, 160.8, 149.6]
        const model = fitLinear(xs, ys)!
        const residuals = computeResiduals(model, xs.map((x, i) => ({ label: `x${x}`, x, y: ys[i] })))
        expect(residuals.some(r => Math.abs(r.standardizedResidual) > 2)).toBe(false)
    })
})

describe('predict quadratic root choice', () => {
    it('returns the root inside the calibration range when the vertex lies between 0 and the data', () => {
        // Standards at x = 1..3 on y = (x - 0.8)^2 + 10; the mirror root of x = 1.2 sits at 0.4
        const xs = [1, 1.5, 2, 2.5, 3]
        const ys = xs.map(x => (x - 0.8) ** 2 + 10)
        const model = fitQuadratic(xs, ys)!
        expect(predict(model, evaluateModel(model, 1.2))).toBeCloseTo(1.2, 5)
    })

    it('picks the root on the data side of the vertex when extrapolating', () => {
        const xs = [1, 2, 3, 4]
        const ys = xs.map(x => (x + 1) ** 2)
        const model = fitQuadratic(xs, ys)!
        // y = 0.25 has roots -0.5 and -1.5; -0.5 lies on the data side of the vertex at -1
        expect(predict(model, 0.25)).toBeCloseTo(-0.5, 5)
    })

    it('returns null when the curve turns inside the range and neither root is in it', () => {
        const model: QuadraticModel = { type: 'quadratic', a: -1, b: 4, c: 0, r2: 1, xMin: 1, xMax: 3 }
        // Vertex at x = 2 (y = 4); y = 1 crosses at 0.27 and 3.73, both outside [1, 3]
        expect(predict(model, 1)).toBeNull()
    })

    it('still works for models saved before the x-range was stored', () => {
        const model: QuadraticModel = { type: 'quadratic', a: 1, b: 0, c: 0, r2: 1 }
        expect(predict(model, 9)).toBeCloseTo(3)
    })
})

describe('concentrationUncertainty', () => {
    it('converts the color-unit RSE to concentration units through the slope', () => {
        const model: LinearModel = { type: 'linear', m: -20, b: 200, r2: 0.99 }
        expect(concentrationUncertainty(model, 3, 4)).toBeCloseTo(0.2)
    })

    it('uses the local slope of a curve', () => {
        const model: QuadraticModel = { type: 'quadratic', a: 1, b: 0, c: 0, r2: 1 }
        // dy/dx at x = 5 is 10
        expect(concentrationUncertainty(model, 5, 2)).toBeCloseTo(0.2)
    })

    it('returns null when the curve is flat', () => {
        const model: LinearModel = { type: 'linear', m: 0, b: 200, r2: 0 }
        expect(concentrationUncertainty(model, 3, 4)).toBeNull()
    })
})
