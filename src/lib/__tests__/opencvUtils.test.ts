import { describe, it, expect } from 'vitest'
import type { Shape } from '@/types'
import { nextLabel, labelInReadingOrder } from '@/lib/opencvUtils'

function circle(x: number, y: number): Shape {
    return { id: `${x},${y}`, label: '', type: 'circle', x, y, radius: 20, color: [0, 0, 0], imageIndex: 0 }
}

describe('nextLabel', () => {
    it('uses a-z first, skipping letters already in use', () => {
        expect(nextLabel(new Set())).toBe('a')
        expect(nextLabel(new Set(['a', 'b', 'd']))).toBe('c')
    })

    it('never repeats a label after running out of letters', () => {
        const used = new Set<string>()
        const labels = Array.from({ length: 60 }, () => nextLabel(used))
        expect(new Set(labels).size).toBe(60)
        expect(labels[26]).toBe('?1')
    })
})

describe('labelInReadingOrder', () => {
    it('labels a 2 x 3 plate top row first, left to right, even when slightly tilted', () => {
        // Detection order is scrambled and each row drifts a few pixels
        const shapes = [circle(200, 104), circle(50, 150), circle(50, 100), circle(125, 152), circle(125, 102), circle(200, 154)]
        const labeled = labelInReadingOrder(shapes, new Set())
        expect(labeled.map(s => `${s.label}:${s.id}`)).toEqual([
            'a:50,100', 'b:125,102', 'c:200,104',
            'd:50,150', 'e:125,152', 'f:200,154',
        ])
    })

    it('skips labels already used on other images', () => {
        const labeled = labelInReadingOrder([circle(50, 50), circle(100, 50)], new Set(['a', 'b']))
        expect(labeled.map(s => s.label)).toEqual(['c', 'd'])
    })
})
