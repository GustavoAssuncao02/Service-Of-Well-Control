import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { getDriveFileMetadata, getDriveFileStream } from '../services/googleDrive.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const driveRoutes = Router();

driveRoutes.use(authenticate);

function contentDispositionFilename(fileName) {
  const fallback = String(fileName || 'arquivo')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');

  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName || 'arquivo')}`;
}

async function findAccessibleFile(db, user, fileId) {
  const userFile = await db.get(
    `SELECT drive_file_id, nome_arquivo, tipo_arquivo
     FROM usuario_arquivos
     WHERE drive_file_id = ? AND usuario_id = ?`,
    fileId,
    user.id
  );

  if (userFile) return userFile;

  if (user.role !== 'admin') return null;

  return db.get(
    `SELECT drive_file_id, nome_arquivo, tipo_arquivo
     FROM aluno_documentos
     WHERE drive_file_id = ?`,
    fileId
  );
}

driveRoutes.get(
  '/files/:fileId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const file = await findAccessibleFile(db, req.user, req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'Arquivo nao encontrado.' });
    }

    const metadata = await getDriveFileMetadata(file.drive_file_id);
    const fileStream = await getDriveFileStream(file.drive_file_id);
    const fileName = metadata.name || file.nome_arquivo || 'arquivo';
    const mimeType = metadata.mimeType || file.tipo_arquivo || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', contentDispositionFilename(fileName));
    res.setHeader('Cache-Control', 'private, max-age=60');

    if (metadata.size) {
      res.setHeader('Content-Length', metadata.size);
    }

    fileStream.on('error', (error) => {
      if (!res.headersSent) {
        res.status(500).json({ message: 'Nao foi possivel abrir o arquivo.' });
      } else {
        res.destroy(error);
      }
    });

    fileStream.pipe(res);
  })
);
