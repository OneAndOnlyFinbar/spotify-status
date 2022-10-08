import { Connection } from 'mysql2';
import { Routes } from './Routes';

export class TokenManager {
  database: Connection;

  constructor(database: Connection) {
    this.database = database;
  }

  private async _refreshToken(userId: string): Promise<string | void> {
    return new Promise((resolve) => {
      this.database.query(`SELECT * FROM tokens WHERE userId = ?`, [userId], async (err, results) => {
        const tokenRequest = await (await fetch(Routes.SPOTIFY_REFRESH(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET, results[0].refreshToken), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
          }
        })).json();
        if(!tokenRequest.access_token || tokenRequest.error) return resolve();
        await this.setUserToken(userId, tokenRequest.access_token, tokenRequest.refresh_token, tokenRequest.expires_in);
        resolve(tokenRequest.access_token);
      });
    });
  }

  public async setUserToken(userId: string, accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    return new Promise((resolve) => {
      this.database.query(`INSERT INTO tokens (userId, accessToken, refreshToken, expiresAt) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE accessToken = ?, refreshToken = ?, expiresAt = ?`,
        [userId, accessToken, refreshToken, expiresIn * 1000 + Date.now(), accessToken, refreshToken, expiresIn * 1000 + Date.now()], (err, results) => {
        resolve();
      });
    });
  }

  public async getUserToken(userId: string): Promise<string> {
    return new Promise((resolve) => {
      this.database.query(`SELECT * FROM tokens WHERE userId = ?`, [userId], async (err, results) => {
        if (err) return resolve(null);
        if (results[0].expiresAt < Date.now()) return resolve(await this._refreshToken(userId) as string);
        resolve(results[0].accessToken);
      });
    });
  }
}