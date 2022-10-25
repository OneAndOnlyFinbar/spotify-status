export function hexToRGB(hex: string): { r: number, g: number, b: number } {
    const aRgbHex = hex.match(/.{1,2}/g);
    return {
        r: parseInt(aRgbHex[0], 16),
        g: parseInt(aRgbHex[1], 16),
        b: parseInt(aRgbHex[2], 16)
    }
}