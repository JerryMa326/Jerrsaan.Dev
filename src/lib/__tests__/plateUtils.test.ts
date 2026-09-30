import { describe, it, expect } from 'vitest'
import { parseConcentrationCSV } from '@/lib/plateUtils'

describe('parseConcentrationCSV', () => {
    it('parses label,concentration lines and skips a header row', () => {
        expect(parseConcentrationCSV('Label,Concentration\nA1,0.5\nA2,1.0')).toEqual([
            { label: 'A1', concentration: 0.5 },
            { label: 'A2', concentration: 1 },
        ])
    })

    it('handles tab-separated input', () => {
        expect(parseConcentrationCSV('A1\t0.25\nB2\t1e-3')).toEqual([
            { label: 'A1', concentration: 0.25 },
            { label: 'B2', concentration: 0.001 },
        ])
    })

    it('keeps a quoted label containing a comma intact', () => {
        expect(parseConcentrationCSV('"Sample, 1",0.5\n"Sample, 2","1.5"')).toEqual([
            { label: 'Sample, 1', concentration: 0.5 },
            { label: 'Sample, 2', concentration: 1.5 },
        ])
    })

    it('reads values that carry a unit', () => {
        expect(parseConcentrationCSV('A1,0.5 mM\nA2,10µM')).toEqual([
            { label: 'A1', concentration: 0.5 },
            { label: 'A2', concentration: 10 },
        ])
    })
})
