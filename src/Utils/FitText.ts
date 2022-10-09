import { SKRSContext2D } from '@napi-rs/canvas';

export function fitText(ctx: SKRSContext2D, text: string, maxWidth: number, startSize: number): void {
    if (ctx.measureText(text).width > maxWidth) {
        while (ctx.measureText(text).width > maxWidth) {
            startSize--;
            ctx.font = `${startSize}px sans-serif`;
        }
    }
}