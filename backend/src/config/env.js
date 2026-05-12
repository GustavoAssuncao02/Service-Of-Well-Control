import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function envValue(name) {
  return String(process.env[name] || '').trim();
}

function envNumber(name, fallback) {
  const value = Number(envValue(name) || fallback);
  return Number.isFinite(value) ? value : fallback;
}

function envBoolean(name, fallback = false) {
  const rawValue = envValue(name).toLowerCase();

  if (!rawValue) return fallback;
  if (['true', '1', 'yes', 'sim', 'on'].includes(rawValue)) return true;
  if (['false', '0', 'no', 'nao', 'não', 'off'].includes(rawValue)) return false;

  return fallback;
}

const googleDriveAuthType = envValue('GOOGLE_DRIVE_AUTH_TYPE').toLowerCase() || 'service_account';
const googleDriveCredentialsJson = envValue('GOOGLE_DRIVE_CREDENTIALS_JSON');
const googleDriveCredentialsFile = envValue('GOOGLE_DRIVE_CREDENTIALS_FILE');
const googleDriveOauthClientJson = envValue('GOOGLE_DRIVE_OAUTH_CLIENT_JSON');
const googleDriveOauthClientFile = envValue('GOOGLE_DRIVE_OAUTH_CLIENT_FILE');
const googleDriveOauthRefreshToken = envValue('GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN');
const hasGoogleDriveServiceAccountConfig = Boolean(googleDriveCredentialsJson || googleDriveCredentialsFile);
const hasGoogleDriveOauthConfig = Boolean(
  googleDriveOauthRefreshToken &&
  (googleDriveOauthClientJson || googleDriveOauthClientFile)
);
const googleDriveConfigured = googleDriveAuthType === 'oauth'
  ? hasGoogleDriveOauthConfig
  : hasGoogleDriveServiceAccountConfig;

export const env = {
  port: envNumber('PORT', 3333),
  host: envValue('HOST') || '0.0.0.0',
  jwtSecret: envValue('JWT_SECRET') || 'dev-secret-change-me',
  jwtExpiresIn: envValue('JWT_EXPIRES_IN') || '14d',
  dbHost: envValue('DB_HOST') || 'localhost',
  dbPort: envNumber('DB_PORT', 3306),
  dbUser: envValue('DB_USER') || 'root',
  dbPassword: envValue('DB_PASSWORD'),
  dbName: envValue('DB_NAME') || 'service_of_wellcontrol',
  adminName: envValue('ADMIN_NAME') || 'Administrador SWC',
  adminEmail: envValue('ADMIN_EMAIL') || 'admin@swc.com',
  adminPassword: envValue('ADMIN_PASSWORD') || 'admin123',
  googleDriveEnabled: envBoolean('GOOGLE_DRIVE_ENABLED') || googleDriveConfigured,
  googleDriveAuthType,
  googleDriveCredentialsJson,
  googleDriveCredentialsFile,
  googleDriveOauthClientJson,
  googleDriveOauthClientFile,
  googleDriveOauthRedirectUri: envValue('GOOGLE_DRIVE_OAUTH_REDIRECT_URI') || 'http://localhost:4100/oauth2callback',
  googleDriveOauthRefreshToken,
  googleDriveParentFolderId: envValue('GOOGLE_DRIVE_PARENT_FOLDER_ID'),
  googleDriveStudentsFolderId: envValue('GOOGLE_DRIVE_STUDENTS_FOLDER_ID'),
  googleDriveStudentsFolderName: envValue('GOOGLE_DRIVE_STUDENTS_FOLDER_NAME') || 'Alunos',
  googleDriveUserAreaFolderId: envValue('GOOGLE_DRIVE_USER_AREA_FOLDER_ID'),
  googleDriveUserAreaFolderName: envValue('GOOGLE_DRIVE_USER_AREA_FOLDER_NAME') || 'Usuarios',
  googleDriveMakeFilesPublic: envBoolean('GOOGLE_DRIVE_MAKE_FILES_PUBLIC'),
  googleDriveDeleteFiles: envBoolean('GOOGLE_DRIVE_DELETE_FILES', true),
  googleDriveMaxUploadMb: envNumber('GOOGLE_DRIVE_MAX_UPLOAD_MB', 25) || 25,
  googleDriveUploadConcurrency: Math.max(1, Math.min(8, envNumber('GOOGLE_DRIVE_UPLOAD_CONCURRENCY', 4) || 4))
};
