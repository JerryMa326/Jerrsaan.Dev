import { describe, it, expect } from 'vitest'
import { resolveLabelEdit } from '@/lib/labelUtils'

describe('resolveLabelEdit', () => {
    it('trims surrounding whitespace', () => {
        expect(resolveLabelEdit('  A1  ', 'A1', [])).toBe('A1')
    })

    it('rejects an empty label so the row does not vanish', () => {
        expect(resolveLabelEdit('', 'A1', ['B2'])).toBeNull()
        expect(resolveLabelEdit('   ', 'A1', ['B2'])).toBeNull()
    })

    it('rejects a label that collides with another sample', () => {
        expect(resolveLabelEdit('B2', 'A1', ['B2', 'C3'])).toBeNull()
    })

    it('allows keeping the same label unchanged', () => {
        expect(resolveLabelEdit('A1', 'A1', ['B2'])).toBe('A1')
    })

    it('allows renaming to a label nobody else has', () => {
        expect(resolveLabelEdit('D4', 'A1', ['B2', 'C3'])).toBe('D4')
    })
})
