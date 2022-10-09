import * as express from 'express';
import * as mysql from 'mysql2';
import * as fs from 'fs';
import fetch from 'node-fetch';
import 'dotenv/config';
import { Routes, TokenManager } from './Structures';
import { downloadURI, roundImage, fitText, formatDuration, canvasError } from './Utils';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const connection: mysql.Connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
const app: express.Application = express();
const tokenManager = new TokenManager(connection);

app.get('/', (req, res) => {
    res.redirect('/authorize');
});

app.get('/authorize', (req, res) => {
    res.redirect(Routes.SPOTIFY_AUTH(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_REDIRECT_URI, ['user-read-currently-playing']));
});

app.get('/callback', async (req, res) => {
    if (!req.query.code) return res.redirect('/authorize');

    const tokenRequest = await (await fetch(Routes.SPOTIFY_TOKEN(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET, req.query.code as string, process.env.SPOTIFY_REDIRECT_URI), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
        }
    })).json();
    if (!tokenRequest.access_token || tokenRequest.error) return res.redirect('/authorize');
    const userRequest = await (await fetch(Routes.ME, {
        headers: {
            'Authorization': `${tokenRequest.token_type} ${tokenRequest.access_token}`
        }
    })).json();
    await tokenManager.setUserToken(userRequest.id, tokenRequest.access_token, tokenRequest.refresh_token, tokenRequest.expires_in);
    res.send('Success!');
});

app.get('/current/:userId', async (req, res) => {
    const token = await tokenManager.getUserToken(req.params.userId);
    if (!token) return res.json({ success: false, error: 'Invalid token' });

    let currentRequest = await fetch(Routes.CURRENTLY_PLAYING, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (currentRequest.status === 204) {
        const canvas = canvasError('Nothing is currently playing');
        res.set('Content-Type', 'image/png');
        return res.end(canvas.toBuffer('image/png'));
    } else
        currentRequest = await currentRequest.json();

    // Options
    const backgroundColor = req.query.backgroundColor as string || '#212121';
    const trackColor = req.query.trackColor as string || '#fff';
    const artistColor = req.query.artistColor as string || '#b3b3b3';
    const albumColor = req.query.albumColor as string || '#b3b3b3';
    const progressBarProgressed = req.query.progressBarColor as string || '#1ed760';
    const progressBarTotal = req.query.progressBarTotal as string || '#137937';
    const progressBarDotColor = req.query.progressBarDotColor as string || '#1db954';
    const progressBarDotBorderColor = req.query.progressBarDotBorderColor as string || '#000';
    const progressBarDotBorderWidth = parseInt(req.query.progressBarDotBorderWidth as string) || 2;
    const progressTextColor = req.query.progressTextColor as string || '#fff';
    const customFont = req.query.customFont as string || 'Arial';

    // Initialize canvas
    const canvas = createCanvas(500, 200);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 500, 200);

    // Album Art
    const albumCanvas = createCanvas(200, 200);
    const albumCtx = albumCanvas.getContext('2d');

    await downloadURI(currentRequest.item.album.images[0].url, `./temp/${currentRequest.item.album.id}.png`);
    const albumImage = await loadImage(`./temp/${currentRequest.item.album.id}.png`);
    roundImage(albumCtx, 0, 0, 200, 200, 40);
    albumCtx.drawImage(albumImage, 10, 10, 180, 180);
    ctx.drawImage(albumCanvas, 0, 0, 200, 200);

    // Song Name
    ctx.font = `30px ${customFont}`;
    ctx.fillStyle = trackColor;
    fitText(ctx, currentRequest.item.name, 260, 30);
    ctx.fillText(currentRequest.item.name, 220, 50);

    // Album Name
    ctx.font = `20px ${customFont}`;
    ctx.fillStyle = albumColor;
    fitText(ctx, currentRequest.item.album.name, 260, 20);
    ctx.fillText(`on ${currentRequest.item.album.name}`, 220, 80);

    // Artist Name
    ctx.font = `20px ${customFont}`;
    ctx.fillStyle = artistColor;
    fitText(ctx, currentRequest.item.artists[0].name, 260, 20);
    ctx.fillText(`by ${currentRequest.item.artists[0].name}`, 220, 110);

    // Progress Bar
    ctx.fillStyle = progressBarTotal;
    ctx.fillRect(220, 171, 250, 8);
    ctx.fillStyle = progressBarProgressed;
    ctx.fillRect(220, 170, 250 * (currentRequest.progress_ms / currentRequest.item.duration_ms), 10);
    ctx.fillStyle = progressBarDotColor;
    ctx.beginPath();
    ctx.arc(220 + 250 * (currentRequest.progress_ms / currentRequest.item.duration_ms), 175, 7, 0, 2 * Math.PI);
    ctx.strokeStyle = progressBarDotBorderColor;
    ctx.lineWidth = progressBarDotBorderWidth;
    ctx.stroke();
    ctx.fill();

    // Progress Bar Text
    ctx.font = `15px ${customFont}`;
    ctx.fillStyle = progressTextColor;
    ctx.fillText(`${formatDuration(currentRequest.progress_ms)} / ${formatDuration(currentRequest.item.duration_ms)}`, 220, 160);

    res.writeHead(200, { contentType: 'image/png' });
    res.end(canvas.toBuffer('image/png'));

    fs.unlinkSync(`./temp/${currentRequest.item.album.id}.png`);
});

app.listen(3000, () => {
    console.log('Listening on port 3000');
});