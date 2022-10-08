import * as express from 'express';
import 'dotenv/config';
import fetch from 'node-fetch';
import { Routes, TokenManager } from './Structures';
import * as mysql from 'mysql2';

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
  if(!tokenRequest.access_token || tokenRequest.error) return res.redirect('/authorize');
  const userRequest = await (await fetch(Routes.ME, {
    headers: {
      'Authorization': `${tokenRequest.token_type} ${tokenRequest.access_token}`
    }
  })).json();
  await tokenManager.setUserToken(userRequest.id, tokenRequest.access_token, tokenRequest.refresh_token, tokenRequest.expires_in);
  res.send('Success!');
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});