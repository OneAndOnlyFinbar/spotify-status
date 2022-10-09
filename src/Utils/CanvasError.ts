import { Canvas, createCanvas } from '@napi-rs/canvas';

export function canvasError(error: string): Canvas {
    const canvas = createCanvas(500, 200);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#191414';
    ctx.fillRect(0, 0, 500, 200);
    ctx.fillStyle = '#1ed760';
    ctx.font = '30px sans-serif';
    const textWidth = ctx.measureText(error).width;
    ctx.fillText(error, (500 - textWidth) / 2, 110);
    return canvas;
}