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

    it('evaluates a power model with x <= 0 returning 0', () => {
        const model: PowerModel = { type: 'power', a: 2, b: 3, r2: 1 }
        expect(evaluateModel(model, 0)).toBe(0)
        expect(evaluateModel(model, -1)).toBe(0)
    })

    it('evaluates a logarithmic model', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 5, b: 10, r2: 1 }
        // 5 * ln(e) + 10 = 15
        expect(evaluateModel(model, Math.E)).toBeCloseTo(15)
    })

    it('evaluates a logarithmic model with x <= 0 returning 0', () => {
        const model: LogarithmicModel = { type: 'logarithmic', a: 5, b: 10, r2: 1 }
        expect(evaluateModel(model, 0)).toBe(0)
        expect(evaluateModel(model, -1)).toBe(0)
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
