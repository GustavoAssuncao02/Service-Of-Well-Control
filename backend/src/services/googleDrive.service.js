import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { google } from 'googleapis';
import { env } from '../config/env.js';

const folderMimeType = 'application/vnd.google-apps.folder';
const driveScopes = ['https://www.googleapis.com/auth/drive'];

let driveClientPromise;
let studentsRootFolderPromise;
let userAreaRootFolderPromise;
const folderPromiseCache = new Map();

function createHttpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function assertDriveEnabled() {
  if (!env.googleDriveEnabled) {
    throw createHttpError('Google Drive ainda nao esta configurado no backend.', 503);
  }
}

function normalizePrivateKey(privateKey) {
  return String(privateKey || '').replace(/\\n/g, '\n');
}

async function loadJsonConfig(jsonValue, filePath, missingMessage) {
  if (jsonValue) {
    const rawCredentials = jsonValue.trim();
    const jsonText = rawCredentials.startsWith('{')
      ? rawCredentials
      : Buffer.from(rawCredentials, 'base64').toString('utf8');

    return JSON.parse(jsonText);
  }

  if (filePath) {
    const credentialsPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    return JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
  }

  throw createHttpError(missingMessage, 503);
}

async function loadServiceAccountCredentials() {
  const credentials = await loadJsonConfig(
    env.googleDriveCredentialsJson,
    env.googleDriveCredentialsFile,
    'Informe GOOGLE_DRIVE_CREDENTIALS_JSON ou GOOGLE_DRIVE_CREDENTIALS_FILE no backend/.env.'
  );

  return {
    ...credentials,
    private_key: normalizePrivateKey(credentials.private_key)
  };
}

async function loadOauthClientCredentials() {
  const credentials = await loadJsonConfig(
    env.googleDriveOauthClientJson,
    env.googleDriveOauthClientFile,
    'Informe GOOGLE_DRIVE_OAUTH_CLIENT_JSON ou GOOGLE_DRIVE_OAUTH_CLIENT_FILE no backend/.env.'
  );

  const client = credentials.web || credentials.installed || credentials;

  if (!client.client_id || !client.client_secret) {
    throw createHttpError('Credencial OAuth invalida. Informe um JSON com client_id e client_secret.', 503);
  }

  return client;
}

async function getDriveClient() {
  assertDriveEnabled();

  if (!driveClientPromise) {
    driveClientPromise = (async () => {
      let auth;

      if (env.googleDriveAuthType === 'oauth') {
        if (!env.googleDriveOauthRefreshToken) {
          throw createHttpError('Informe GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN no backend/.env.', 503);
        }

        const credentials = await loadOauthClientCredentials();
        auth = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          env.googleDriveOauthRedirectUri
        );
        auth.setCredentials({ refresh_token: env.googleDriveOauthRefreshToken });
      } else {
        const credentials = await loadServiceAccountCredentials();
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: driveScopes
        });
      }

      return google.drive({ version: 'v3', auth });
    })();
  }

  return driveClientPromise;
}

function escapeDriveQueryValue(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function folderQuery(name, parentFolderId) {
  const parts = [
    `mimeType='${folderMimeType}'`,
    `name='${escapeDriveQueryValue(name)}'`,
    'trashed=false'
  ];

  if (parentFolderId) {
    parts.push(`'${escapeDriveQueryValue(parentFolderId)}' in parents`);
  }

  return parts.join(' and ');
}

async function findFolder(drive, name, parentFolderId) {
  const { data } = await drive.files.list({
    q: folderQuery(name, parentFolderId),
    fields: 'files(id, name, webViewLink)',
    pageSize: 1,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  return data.files?.[0] || null;
}

async function createFolder(drive, name, parentFolderId) {
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: folderMimeType,
      parents: parentFolderId ? [parentFolderId] : undefined
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true
  });

  return data;
}

async function findOrCreateFolder(drive, name, parentFolderId = '') {
  const folder = await findFolder(drive, name, parentFolderId);
  if (folder) return folder;

  return createFolder(drive, name, parentFolderId);
}

async function findOrCreateFolderCached(drive, name, parentFolderId = '') {
  const cacheKey = `${parentFolderId || 'root'}::${name}`;

  if (!folderPromiseCache.has(cacheKey)) {
    const promise = findOrCreateFolder(drive, name, parentFolderId).catch((error) => {
      folderPromiseCache.delete(cacheKey);
      throw error;
    });
    folderPromiseCache.set(cacheKey, promise);
  }

  return folderPromiseCache.get(cacheKey);
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function getStudentsRootFolder(drive) {
  if (env.googleDriveStudentsFolderId) {
    return {
      id: env.googleDriveStudentsFolderId,
      name: env.googleDriveStudentsFolderName
    };
  }

  if (!studentsRootFolderPromise) {
    studentsRootFolderPromise = findOrCreateFolder(
      drive,
      env.googleDriveStudentsFolderName,
      env.googleDriveParentFolderId
    );
  }

  return studentsRootFolderPromise;
}

async function getUserAreaRootFolder(drive) {
  if (env.googleDriveUserAreaFolderId) {
    return {
      id: env.googleDriveUserAreaFolderId,
      name: env.googleDriveUserAreaFolderName
    };
  }

  if (!userAreaRootFolderPromise) {
    userAreaRootFolderPromise = findOrCreateFolder(
      drive,
      env.googleDriveUserAreaFolderName,
      env.googleDriveParentFolderId
    );
  }

  return userAreaRootFolderPromise;
}

function userAreaFolderName({ userId, userName }) {
  const name = String(userName || 'Usuario').trim() || 'Usuario';
  return `${name} - Usuario ${userId}`;
}

async function getUserDriveFolder(drive, user) {
  const userAreaRootFolder = await getUserAreaRootFolder(drive);
  return findOrCreateFolderCached(drive, userAreaFolderName(user), userAreaRootFolder.id);
}

async function makeFilePublic(drive, fileId) {
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    },
    supportsAllDrives: true
  });
}

async function uploadFileToFolder(drive, targetFolderId, file) {
  const { data } = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [targetFolderId]
    },
    media: {
      mimeType: file.mimetype || 'application/octet-stream',
      body: Readable.from(file.buffer)
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true
  });

  if (env.googleDriveMakeFilesPublic) {
    await makeFilePublic(drive, data.id);
  }

  return {
    fileId: data.id,
    fileName: data.name,
    folderId: targetFolderId,
    url: data.webViewLink
  };
}

async function getStudentDocumentTargetFolder(drive, { studentName, classFolderName }) {
  const studentsRootFolder = await getStudentsRootFolder(drive);
  const studentFolder = await findOrCreateFolderCached(drive, studentName, studentsRootFolder.id);
  return classFolderName
    ? findOrCreateFolderCached(drive, classFolderName, studentFolder.id)
    : studentFolder;
}

export async function uploadStudentDocumentToDrive({ studentName, classFolderName, file }) {
  const drive = await getDriveClient();
  const targetFolder = await getStudentDocumentTargetFolder(drive, { studentName, classFolderName });
  return uploadFileToFolder(drive, targetFolder.id, file);
}

export async function uploadStudentDocumentsToDrive({ studentName, classFolderName, files }) {
  const drive = await getDriveClient();
  const targetFolder = await getStudentDocumentTargetFolder(drive, { studentName, classFolderName });

  return mapWithConcurrency(files, env.googleDriveUploadConcurrency, async (file) => ({
    file,
    driveFile: await uploadFileToFolder(drive, targetFolder.id, file)
  }));
}

export async function createUserAreaFolderOnDrive({ userId, userName, folderName }) {
  const drive = await getDriveClient();
  const userFolder = await getUserDriveFolder(drive, { userId, userName });
  const folder = await createFolder(drive, folderName, userFolder.id);

  return {
    folderId: folder.id,
    folderName: folder.name,
    url: folder.webViewLink
  };
}

export async function uploadUserAreaFileToDrive({ userId, userName, folderDriveId, file }) {
  const drive = await getDriveClient();
  const userFolder = folderDriveId ? null : await getUserDriveFolder(drive, { userId, userName });
  const targetFolderId = folderDriveId || userFolder.id;

  return uploadFileToFolder(drive, targetFolderId, file);
}

export async function uploadUserAreaFilesToDrive({ userId, userName, folderDriveId, files }) {
  const drive = await getDriveClient();
  const userFolder = folderDriveId ? null : await getUserDriveFolder(drive, { userId, userName });
  const targetFolderId = folderDriveId || userFolder.id;

  return mapWithConcurrency(files, env.googleDriveUploadConcurrency, async (file) => ({
    file,
    driveFile: await uploadFileToFolder(drive, targetFolderId, file)
  }));
}

export async function getDriveFileMetadata(fileId) {
  const drive = await getDriveClient();
  const { data } = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size',
    supportsAllDrives: true
  });

  return data;
}

export async function getDriveFileStream(fileId, range = '') {
  const drive = await getDriveClient();
  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
      supportsAllDrives: true
    },
    {
      responseType: 'stream',
      headers: range ? { Range: range } : undefined
    }
  );

  return {
    stream: response.data,
    headers: response.headers || {},
    status: response.status
  };
}

export async function deleteDriveFile(fileId) {
  if (!env.googleDriveEnabled || !fileId || !env.googleDriveDeleteFiles) return;

  const drive = await getDriveClient();

  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true
    });
  } catch (error) {
    if (error?.code !== 404 && error?.response?.status !== 404) {
      throw error;
    }
  }
}
