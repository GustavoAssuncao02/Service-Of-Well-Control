import fs from 'node:fs';
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const testRoutes = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../storage/test-uploads');
const maxUploadSize = 50 * 1024 * 1024;

fs.mkdirSync(uploadDir, { recursive: true });

testRoutes.use(authenticate, requireAdmin);

function sanitizeFileName(fileName) {
  return path
    .basename(String(fileName || 'arquivo'))
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'arquivo';
}

function originalNameFromStoredName(fileName) {
  return fileName.replace(/^\d+-[a-f0-9-]+-/i, '') || fileName;
}

function resolveStoredFile(fileName) {
  const safeName = path.basename(String(fileName || ''));
  const filePath = path.resolve(uploadDir, safeName);

  if (!safeName || !filePath.startsWith(`${uploadDir}${path.sep}`)) {
    const error = new Error('Arquivo invalido.');
    error.status = 400;
    throw error;
  }

  return { safeName, filePath };
}

function formatFile(row) {
  return {
    id: row.name,
    nome_arquivo: originalNameFromStoredName(row.name),
    nome_salvo: row.name,
    tamanho_bytes: row.stats.size,
    criado_em: row.stats.birthtime,
    atualizado_em: row.stats.mtime,
    download_url: `/test/files/${encodeURIComponent(row.name)}/download`
  };
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, uploadDir);
    },
    filename(req, file, cb) {
      const storedName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(file.originalname)}`;
      cb(null, storedName);
    }
  }),
  limits: {
    fileSize: maxUploadSize,
    files: 1
  }
});

function uploadTestFile(req, res, next) {
  upload.single('arquivo')(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      error.message = 'Arquivo muito grande. O limite desta tela de teste e de 50 MB.';
    }

    next(error);
  });
}

async function listFiles() {
  const entries = await readdir(uploadDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => ({
        name: entry.name,
        stats: await stat(path.join(uploadDir, entry.name))
      }))
  );

  return files
    .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)
    .map(formatFile);
}

testRoutes.get(
  '/files',
  asyncHandler(async (req, res) => {
    res.json(await listFiles());
  })
);

testRoutes.post(
  '/upload',
  uploadTestFile,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Selecione um arquivo para upload.' });
    }

    const stats = await stat(req.file.path);
    res.status(201).json(
      formatFile({
        name: req.file.filename,
        stats
      })
    );
  })
);

testRoutes.get(
  '/files/:fileName/download',
  asyncHandler(async (req, res) => {
    const { safeName, filePath } = resolveStoredFile(req.params.fileName);
    const fileStats = await stat(filePath).catch(() => null);

    if (!fileStats?.isFile()) {
      return res.status(404).json({ message: 'Arquivo nao encontrado.' });
    }

    res.download(filePath, originalNameFromStoredName(safeName));
  })
);

testRoutes.delete(
  '/files/:fileName',
  asyncHandler(async (req, res) => {
    const { filePath } = resolveStoredFile(req.params.fileName);
    await unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    res.status(204).send();
  })
);
