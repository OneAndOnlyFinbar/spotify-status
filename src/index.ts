import * as express from 'express';
import * as mysql from 'mysql2';
import 'dotenv/config';
import fetch from 'node-fetch';
import { Routes, TokenManager } from './Structures';
import { download, roundImage, fitText, formatDuration } from './Utils';
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

  const currentRequest = await (await fetch(Routes.CURRENTLY_PLAYING, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })).json();
  const canvas = createCanvas(500, 200);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#212121';
  ctx.fillRect(0, 0, 500, 200);

  // Album Art
  const albumCanvas = createCanvas(200, 200);
  const albumCtx = albumCanvas.getContext('2d');

  await download(currentRequest.item.album.images[0].url, `./temp/${currentRequest.item.album.id}.png`);
  const albumImage = await loadImage(`./temp/${currentRequest.item.album.id}.png`);
  roundImage(albumCtx, 0, 0, 200, 200, 20);
  albumCtx.drawImage(albumImage, 0, 0, 200, 200);
  ctx.drawImage(albumCanvas, 0, 0, 200, 200);

  // Song Name
  ctx.font = '30px sans-serif';
  ctx.fillStyle = '#fff';
  fitText(ctx, currentRequest.item.name, 260, 30);
  ctx.fillText(currentRequest.item.name, 220, 50);

  // Album Name
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#959595';
  fitText(ctx, currentRequest.item.album.name, 260, 20);
  ctx.fillText(`on ${currentRequest.item.album.name}`, 220, 80);

  // Artist Name
  ctx.font = '20px Arial';
  fitText(ctx, currentRequest.item.artists.map(artist => artist.name).join(', '), 260, 20);
  ctx.fillText(`by ${currentRequest.item.artists.map(artist => artist.name).join(', ')}`, 220, 110);

  // Progress Bar
  ctx.fillStyle = '#fff';
  ctx.fillRect(220, 180, 250, 10);
  ctx.fillStyle = '#1db954';
  ctx.fillRect(220, 180, 250 * (currentRequest.progress_ms / currentRequest.item.duration_ms), 10);
  ctx.fillStyle = '#0e5a29';
  ctx.beginPath();
  ctx.arc(220 + 250 * (currentRequest.progress_ms / currentRequest.item.duration_ms), 185, 5, 0, 2 * Math.PI);
  ctx.fill();

  // Progress Bar Text
  ctx.font = '15px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${formatDuration(currentRequest.progress_ms)} / ${formatDuration(currentRequest.item.duration_ms)}`, 220, 170);

  res.writeHead(200, { contentType: 'image/png' });
  res.end(canvas.toBuffer('image/png'));
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});