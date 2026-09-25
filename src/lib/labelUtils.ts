// Pure validation for editing a sample's label in ShapesList. Kept out of the
// component so the trim/duplicate rules can be unit tested without rendering
// React.

/**
 * Resolves a typed label edit against the sibling labels it must not
 * collide with.
 *
 * Returns null when the edit should be rejected (reverted to the original
 * label): an empty label would render zero-width and could never be clicked
 * again, and a duplicate label would collide with another sample since the
 * regression keys committed concentration points by label.
 *
 * Otherwise returns the trimmed label to commit - which may equal
 * `currentLabel` when the edit was a no-op change in whitespace only.
 */
export function resolveLabelEdit(
    draft: string,
    currentLabel: string,
    otherLabels: string[]
): string | null {
    const trimmed = draft.trim()
    if (trimmed === '') return null
    if (trimmed !== currentLabel && otherLabels.includes(trimmed)) return null
    return trimmed
}
