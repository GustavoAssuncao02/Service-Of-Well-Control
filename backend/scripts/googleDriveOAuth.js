import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import { google } from 'googleapis';
import { env } from '../src/config/env.js';

const scopes = ['https://www.googleapis.com/auth/drive'];

function createHttpError(message) {
  const error = new Error(message);
  error.status = 1;
  return error;
}

async function loadOauthClientCredentials() {
  let credentials;
  if (env.googleDriveOauthClientJson) {
    const rawCredentials = env.googleDriveOauthClientJson.trim();
    const jsonText = rawCredentials.startsWith('{')
      ? rawCredentials
      : Buffer.from(rawCredentials, 'base64').toString('utf8');
    credentials = JSON.parse(jsonText);
  } else if (env.googleDriveOauthClientFile) {
    const credentialsPath = path.isAbsolute(env.googleDriveOauthClientFile)
      ? env.googleDriveOauthClientFile
      : path.resolve(process.cwd(), env.googleDriveOauthClientFile);
    credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
  } else {
    throw createHttpError('Configure GOOGLE_DRIVE_OAUTH_CLIENT_FILE ou GOOGLE_DRIVE_OAUTH_CLIENT_JSON no backend/.env.');
  }

  const client = credentials.web || credentials.installed || credentials;
  if (!client.client_id || !client.client_secret) {
    throw createHttpError('O arquivo OAuth nao contem client_id/client_secret.');
  }

  return client;
}

async function main() {
  const client = await loadOauthClientCredentials();
  const redirectUri = env.googleDriveOauthRedirectUri || 'http://localhost:4100/oauth2callback';
  const redirectUrl = new URL(redirectUri);
  const oauth2Client = new google.auth.OAuth2(client.client_id, client.client_secret, redirectUri);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, redirectUri);
      if (requestUrl.pathname !== redirectUrl.pathname) {
        res.writeHead(404);
        res.end('Rota nao encontrada.');
        return;
      }

      const code = requestUrl.searchParams.get('code');
      if (!code) {
        throw createHttpError('Codigo OAuth ausente na URL de callback.');
      }

      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token) {
        throw createHttpError('O Google nao retornou refresh_token. Revogue o acesso do app e rode este script novamente.');
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>Autorizado</h1><p>Volte ao terminal para copiar o refresh token.</p>');

      console.log('\nGOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=' + tokens.refresh_token);
      console.log('\nCole essa linha no backend/.env e reinicie o backend.');
      server.close();
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(error.message);
      console.error(error.message);
      server.close();
    }
  });

  await new Promise((resolve) => {
    server.listen(Number(redirectUrl.port || 80), redirectUrl.hostname, resolve);
  });

  console.log('Abra esta URL no navegador e autorize o acesso ao Google Drive:\n');
  console.log(authUrl);
  console.log('\nAguardando callback em ' + redirectUri);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(error.status || 1);
});
