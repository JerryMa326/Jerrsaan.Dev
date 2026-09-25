import { describe, it, expect } from 'vitest'
import { parseConcentrationCSV } from '@/lib/plateUtils'

describe('parseConcentrationCSV', () => {
    it('parses plain comma-separated label,concentration lines', () => {
        expect(parseConcentrationCSV('A1,0.5\nA2,1.0\nA3,2')).toEqual([
            { label: 'A1', concentration: 0.5 },
            { label: 'A2', concentration: 1 },
            { label: 'A3', concentration: 2 },
        ])
    })

    it('skips a header row', () => {
        expect(parseConcentrationCSV('Label,Concentration\nA1,0.5')).toEqual([
            { label: 'A1', concentration: 0.5 },
        ])
    })

    it('handles tab-separated input', () => {
        expect(parseConcentrationCSV('Well\tConc\nA1\t0.25\nB2\t1e-3')).toEqual([
            { label: 'A1', concentration: 0.25 },
            { label: 'B2', concentration: 0.001 },
        ])
    })

    it('handles BOM, CRLF, blank lines and surrounding spaces', () => {
        expect(parseConcentrationCSV('﻿A1, 0.5\r\n\r\n  A2 ,1.5  \r\n')).toEqual([
            { label: 'A1', concentration: 0.5 },
            { label: 'A2', concentration: 1.5 },
        ])
    })

    it('keeps extra columns out of the result', () => {
        expect(parseConcentrationCSV('A1,0.5,first run\nA2,-1,')).toEqual([
            { label: 'A1', concentration: 0.5 },
            { label: 'A2', concentration: -1 },
        ])
    })

    it('reads a quoted comma-decimal value in a comma-separated file', () => {
        expect(parseConcentrationCSV('A1,"0,5"\nA2,"1.25"')).toEqual([
            { label: 'A1', concentration: 0.5 },
            { label: 'A2', concentration: 1.25 },
        ])
    })

    it('keeps a quoted label containing the delimiter intact', () => {
        expect(parseConcentrationCSV('"Sample, 1",0.5')).toEqual([
            { label: 'Sample, 1', concentration: 0.5 },
        ])
    })

    it('unescapes doubled quotes inside a quoted field', () => {
        expect(parseConcentrationCSV('"Std ""high""",2')).toEqual([
            { label: 'Std "high"', concentration: 2 },
        ])
    })

    it('reads semicolon-separated files with comma decimals (Excel in comma-decimal locales)', () => {
        expect(parseConcentrationCSV('Well;Concentration\r\nA1;0,5\r\nA2;1,25\r\nA3;2')).toEqual([
            { label: 'A1', concentration: 0.5 },
            { label: 'A2', concentration: 1.25 },
            { label: 'A3', concentration: 2 },
        ])
    })

    it('skips rows whose value is not entirely a number', () => {
        expect(parseConcentrationCSV('A1,0.5abc\nA2,\nA3,n/a\nA4,3')).toEqual([
            { label: 'A4', concentration: 3 },
        ])
    })

    it('still strips single quotes around unquoted fields', () => {
        expect(parseConcentrationCSV("'A1','0.5'")).toEqual([
            { label: 'A1', concentration: 0.5 },
        ])
    })

    it('returns nothing for empty input', () => {
        expect(parseConcentrationCSV('')).toEqual([])
        expect(parseConcentrationCSV(' \n\n ')).toEqual([])
    })
})
