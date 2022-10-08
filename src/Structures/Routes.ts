import { Query } from './Query';

export const Routes = {
  ME: 'https://api.spotify.com/v1/me',
  SPOTIFY_AUTH: (clientId: string, redirectURI: string, scopes: string[]) => {
    return `https://accounts.spotify.com/authorize?${new Query({ 
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectURI,
      scope: scopes.join(' '),
    }).build()}`;
  },
  SPOTIFY_TOKEN: (clientId: string, clientSecret: string, code: string, redirectURI: string) => {
    return `https://accounts.spotify.com/api/token?${new Query({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectURI,
    }).build()}`;
  },
  SPOTIFY_REFRESH: (clientId: string, clientSecret: string, refreshToken: string) => {
    return `https://accounts.spotify.com/api/token?${new Query({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).build()}`;
  }
}