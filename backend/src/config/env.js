import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: Number(process.env.PORT || 3333),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '14d',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'service_of_wellcontrol',
  adminName: process.env.ADMIN_NAME || 'Administrador SWC',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@swc.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  googleDriveEnabled: process.env.GOOGLE_DRIVE_ENABLED === 'true',
  googleDriveAuthType: process.env.GOOGLE_DRIVE_AUTH_TYPE || 'service_account',
  googleDriveCredentialsJson: process.env.GOOGLE_DRIVE_CREDENTIALS_JSON || '',
  googleDriveCredentialsFile: process.env.GOOGLE_DRIVE_CREDENTIALS_FILE || '',
  googleDriveOauthClientJson: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_JSON || '',
  googleDriveOauthClientFile: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_FILE || '',
  googleDriveOauthRedirectUri: process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || 'http://localhost:4100/oauth2callback',
  googleDriveOauthRefreshToken: process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN || '',
  googleDriveParentFolderId: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '',
  googleDriveStudentsFolderId: process.env.GOOGLE_DRIVE_STUDENTS_FOLDER_ID || '',
  googleDriveStudentsFolderName: process.env.GOOGLE_DRIVE_STUDENTS_FOLDER_NAME || 'Alunos',
  googleDriveUserAreaFolderId: process.env.GOOGLE_DRIVE_USER_AREA_FOLDER_ID || '',
  googleDriveUserAreaFolderName: process.env.GOOGLE_DRIVE_USER_AREA_FOLDER_NAME || 'Usuarios',
  googleDriveMakeFilesPublic: process.env.GOOGLE_DRIVE_MAKE_FILES_PUBLIC === 'true',
  googleDriveDeleteFiles: process.env.GOOGLE_DRIVE_DELETE_FILES !== 'false',
  googleDriveMaxUploadMb: Number(process.env.GOOGLE_DRIVE_MAX_UPLOAD_MB || 25) || 25
};
