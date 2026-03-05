export interface ColorCalibration {
    whiteRef: [number, number, number] | null
    blackRef: [number, number, number] | null
}

export const defaultColorCalibration: ColorCalibration = {
    whiteRef: null,
    blackRef: null
}

export function calibrateColor(
    raw: [number, number, number],
    cal: ColorCalibration
): [number, number, number] {
    if (!cal.whiteRef || !cal.blackRef) return raw

    return raw.map((v, i) => {
        const black = cal.blackRef![i]
        const white = cal.whiteRef![i]
        const range = white - black
        if (Math.abs(range) < 1) return v
        return Math.max(0, Math.min(255, Math.round(255 * (v - black) / range)))
    }) as [number, number, number]
}
