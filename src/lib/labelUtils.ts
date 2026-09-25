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

/**
 * Carries a sample's concentration over to its new label after a rename.
 *
 * Concentrations are keyed by label, and labels repeat across photos by
 * design (plate templates write A1..H12 on every photo), so the entry under
 * the old label is kept rather than moved: other samples may still carry
 * that label, and an undo of the rename must find it again. An entry whose
 * label no sample carries is ignored by the fit, charts and exports, just as
 * after deleting a sample.
 *
 * Nothing is added when the new label already has a concentration - the
 * renamed sample joins it instead of creating a second entry for one label.
 */
export function carryConcentrationOnRename<P extends { label: string }>(
    points: P[],
    oldLabel: string,
    newLabel: string
): P[] {
    if (oldLabel === newLabel) return points
    const source = points.find(p => p.label === oldLabel)
    if (!source) return points
    if (points.some(p => p.label === newLabel)) return points
    return [...points, { ...source, label: newLabel }]
}
