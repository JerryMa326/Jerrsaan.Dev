import { describe, it, expect } from 'vitest'
import {
    fitLinear,
    fitQuadratic,
    fitPower,
    fitLogarithmic,
    fitBest,
    parsePastedCells,
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
        expect(model.type).toBe('linear')
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

describe('parsePastedCells', () => {
    it('keeps a blank cell so later values stay on their wells', () => {
        expect(parsePastedCells('120\t\t98')).toEqual(['120', '', '98'])
    })

    it('ignores the trailing newline a spreadsheet adds', () => {
        expect(parsePastedCells('1\n2\n3\n')).toEqual(['1', '2', '3'])
        expect(parsePastedCells('1\r\n2\r\n')).toEqual(['1', '2'])
    })

    it('reads rows then tabs in order and trims cells', () => {
        expect(parsePastedCells(' 1\t2 \n3\t\n')).toEqual(['1', '2', '3', ''])
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

    it('flags a point far off an otherwise exact line', () => {
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
        expect(result.filter(r => r.isOutlier).map(r => r.label)).toEqual(['g'])
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

describe('fitBest model selection', () => {
    it('picks linear for exactly linear data', () => {
        const xs = [0, 1, 2, 3, 4, 5]
        expect(fitBest(xs, xs.map(x => 200 - 12 * x))!.type).toBe('linear')
    })

    it('picks linear for mildly noisy linear data', () => {
        // Roughly y = 200 - 12x with a little scatter
        expect(fitBest([0, 1, 2, 3, 4, 5], [200.4, 187.7, 176.3, 163.8, 152.2, 139.9])!.type).toBe('linear')
        expect(fitBest([0, 1, 2, 3, 4, 5, 6, 7], [200.5, 187.2, 176.9, 163.6, 152.3, 140.4, 127.6, 116.2])!.type).toBe('linear')
        // All x > 0, so power and log are candidates too
        expect(fitBest([0.5, 1, 2, 4, 8, 16], [194.2, 188.3, 175.6, 152.4, 104.1, 7.6])!.type).toBe('linear')
    })

    it('picks quadratic for clearly curved data', () => {
        expect(fitBest([0, 1, 2, 3, 4, 5], [221.2, 164.6, 124.3, 87.1, 76.4, 69.8])!.type).toBe('quadratic')
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
    const xs = [0, 1, 2, 3, 4, 5, 6, 7]
    const clean = [200.5, 187.2, 176.9, 163.6, 152.3, 140.4, 127.6, 116.2]
    const flagged = (ys: number[]) =>
        computeResiduals(fitLinear(xs, ys)!, xs.map((x, i) => ({ label: `x${x}`, x, y: ys[i] })))
            .filter(r => r.isOutlier).map(r => r.label)

    it('flags nothing on clean standards', () => {
        expect(flagged(clean)).toEqual([])
    })

    it('flags a standard with a big error', () => {
        const ys = [...clean]
        ys[3] = 140
        expect(flagged(ys)).toEqual(['x3'])
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

    it('picks the root closest to the range when neither is inside it', () => {
        const xs = [1, 2, 3, 4]
        const ys = xs.map(x => (x + 1) ** 2)
        const model = fitQuadratic(xs, ys)!
        // y = 0.25 has roots -0.5 and -1.5; -0.5 is nearer the standards
        expect(predict(model, 0.25)).toBeCloseTo(-0.5, 5)
    })

    it('extrapolates a little past the blank rather than jumping to the far root', () => {
        // y = 200 - 30x + 1.6x^2 on x = 0..10; a reading just above the blank is a little below x = 0
        const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        const model = fitQuadratic(xs, xs.map(x => 200 - 30 * x + 1.6 * x * x))!
        const x = predict(model, 202)!
        expect(x).toBeCloseTo((30 - Math.sqrt(900 + 4 * 1.6 * 2)) / 3.2, 5)
        expect(x).toBeLessThan(0)
    })

    it('still works for models saved before the x-range was stored', () => {
        expect(predict({ type: 'quadratic', a: 1, b: 0, c: 0, r2: 1 }, 9)).toBeCloseTo(3)
        // Roots 2 and 3: the one nearest 0, as before
        expect(predict({ type: 'quadratic', a: 1, b: -5, c: 6, r2: 1 }, 0)).toBeCloseTo(2)
    })
})

describe('concentrationUncertainty', () => {
    const xs = [0, 1, 2, 3, 4, 5]
    const ys = [201, 179, 161, 139, 121, 99]

    it('is RSE / |slope| for a straight line', () => {
        const model = fitLinear(xs, ys)!
        const expected = computeRSE(model, xs, ys) / Math.abs(model.m)
        for (const x0 of [-1, 0.5, 2.5, 7]) {
            expect(concentrationUncertainty(model, x0, xs, ys)).toBeCloseTo(expected, 10)
        }
    })

    it('uses the local slope of a curve', () => {
        const qx = [1, 2, 3, 4, 5, 6]
        const qy = qx.map((x, i) => x * x + 1 + (i % 2 ? 0.5 : -0.5))
        const model = fitQuadratic(qx, qy)!
        const at3 = concentrationUncertainty(model, 3, qx, qy)!
        const at5 = concentrationUncertainty(model, 5, qx, qy)!
        expect(at3).toBeCloseTo(computeRSE(model, qx, qy) / Math.abs(2 * model.a * 3 + model.b), 10)
        // Steeper curve at 5 gives a tighter reading
        expect(at5).toBeLessThan(at3)
    })

    it('uses the slope a*b*x^(b-1) for a power curve and is blank at x <= 0', () => {
        const px = [1, 2, 4, 8, 16]
        const py = px.map((x, i) => 10 * Math.sqrt(x) * Math.exp(i % 2 ? 0.02 : -0.02))
        const model = fitPower(px, py)!
        const slope = model.a * model.b * Math.pow(4, model.b - 1)
        expect(concentrationUncertainty(model, 4, px, py)).toBeCloseTo(computeRSE(model, px, py) / slope, 10)
        expect(concentrationUncertainty(model, 0, px, py)).toBeNull()
    })

    it('returns null when the curve is flat, x is not finite, or there are too few standards', () => {
        const flat: LinearModel = { type: 'linear', m: 0, b: 200, r2: 0 }
        expect(concentrationUncertainty(flat, 3, xs, ys)).toBeNull()
        expect(concentrationUncertainty(fitLinear(xs, ys)!, NaN, xs, ys)).toBeNull()
        expect(concentrationUncertainty(fitLinear([0, 1], [200, 180])!, 0.5, [0, 1], [200, 180])).toBeNull()
    })
})
