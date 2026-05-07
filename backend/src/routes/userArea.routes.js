import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { getDb } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import {
  createUserAreaFolderOnDrive,
  deleteDriveFile,
  uploadUserAreaFileToDrive
} from '../services/googleDrive.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const userAreaRoutes = Router();

userAreaRoutes.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, env.googleDriveMaxUploadMb) * 1024 * 1024
  }
});

const uploadUserFiles = upload.fields([
  { name: 'arquivo', maxCount: 1 },
  { name: 'arquivos', maxCount: 20 }
]);

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeText(value, fieldName, maxLength = 191) {
  const text = String(value || '').trim();

  if (!text) {
    throw httpError(`${fieldName} e obrigatorio.`);
  }

  if (text.length > maxLength) {
    throw httpError(`${fieldName} deve ter no maximo ${maxLength} caracteres.`);
  }

  return text;
}

function normalizeOptionalFolderId(value) {
  if (value === undefined || value === null || value === '') return null;

  const folderId = Number(value);
  if (!Number.isInteger(folderId) || folderId <= 0) {
    throw httpError('Pasta selecionada invalida.');
  }

  return folderId;
}

function normalizeDriveError(error) {
  if (error?.response?.data?.error?.message) {
    error.message = `Google Drive: ${error.response.data.error.message}`;
  }

  return error;
}

async function getCurrentUser(db, userId) {
  const user = await db.get('SELECT id, nome FROM usuarios WHERE id = ?', userId);

  if (!user) {
    throw httpError('Usuario nao encontrado.', 404);
  }

  return user;
}

async function getFolderForUser(db, userId, folderId) {
  const normalizedFolderId = normalizeOptionalFolderId(folderId);
  if (!normalizedFolderId) return null;

  const folder = await db.get(
    'SELECT * FROM usuario_pastas WHERE id = ? AND usuario_id = ?',
    normalizedFolderId,
    userId
  );

  if (!folder) {
    throw httpError('Pasta nao encontrada.', 404);
  }

  if (!folder.drive_folder_id) {
    throw httpError('Pasta sem vinculo com o Google Drive.', 409);
  }

  return folder;
}

async function loadUserArea(db, userId) {
  const [folders, files, notes] = await Promise.all([
    db.all(
      `SELECT up.*,
              COALESCE(file_counts.total_arquivos, 0) AS total_arquivos
       FROM usuario_pastas up
       LEFT JOIN (
         SELECT pasta_id, COUNT(*) AS total_arquivos
         FROM usuario_arquivos
         GROUP BY pasta_id
       ) file_counts ON file_counts.pasta_id = up.id
       WHERE up.usuario_id = ?
       ORDER BY up.nome ASC`,
      userId
    ),
    db.all(
      `SELECT ua.*, up.nome AS pasta_nome
       FROM usuario_arquivos ua
       LEFT JOIN usuario_pastas up ON up.id = ua.pasta_id
       WHERE ua.usuario_id = ?
       ORDER BY ua.criado_em DESC, ua.id DESC`,
      userId
    ),
    db.all(
      `SELECT *
       FROM usuario_notas
       WHERE usuario_id = ?
       ORDER BY atualizado_em DESC, id DESC`,
      userId
    )
  ]);

  return { folders, files, notes };
}

userAreaRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    res.json(await loadUserArea(db, req.user.id));
  })
);

userAreaRoutes.post(
  '/folders',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const user = await getCurrentUser(db, req.user.id);
    const nome = normalizeText(req.body.nome, 'Nome da pasta');

    const duplicate = await db.get(
      'SELECT id FROM usuario_pastas WHERE usuario_id = ? AND nome = ?',
      user.id,
      nome
    );

    if (duplicate) {
      return res.status(409).json({ message: 'Ja existe uma pasta com esse nome na sua area.' });
    }

    let driveFolder = null;

    try {
      driveFolder = await createUserAreaFolderOnDrive({
        userId: user.id,
        userName: user.nome,
        folderName: nome
      });

      const result = await db.run(
        `INSERT INTO usuario_pastas (usuario_id, nome, drive_folder_id, drive_url)
         VALUES (?, ?, ?, ?)`,
        user.id,
        nome,
        driveFolder.folderId,
        driveFolder.url
      );

      const folder = await db.get('SELECT *, 0 AS total_arquivos FROM usuario_pastas WHERE id = ?', result.lastID);
      return res.status(201).json(folder);
    } catch (error) {
      if (driveFolder?.folderId) {
        await deleteDriveFile(driveFolder.folderId);
      }

      throw normalizeDriveError(error);
    }
  })
);

userAreaRoutes.post(
  '/files',
  uploadUserFiles,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const user = await getCurrentUser(db, req.user.id);
    const folder = await getFolderForUser(db, user.id, req.body.pasta_id);
    const files = [...(req.files?.arquivo || []), ...(req.files?.arquivos || [])];

    if (!files.length) {
      return res.status(400).json({ message: 'Selecione um ou mais arquivos para enviar.' });
    }

    const uploadedFiles = [];
    const insertedIds = [];

    try {
      for (const file of files) {
        const driveFile = await uploadUserAreaFileToDrive({
          userId: user.id,
          userName: user.nome,
          folderDriveId: folder?.drive_folder_id || '',
          file
        });
        uploadedFiles.push({ file, driveFile });
      }

      await db.exec('START TRANSACTION');

      for (const item of uploadedFiles) {
        const result = await db.run(
          `INSERT INTO usuario_arquivos (
             usuario_id, pasta_id, nome_arquivo, tipo_arquivo, tamanho_bytes,
             drive_file_id, drive_folder_id, drive_url
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          user.id,
          folder?.id || null,
          item.file.originalname,
          item.file.mimetype || 'Arquivo',
          item.file.size,
          item.driveFile.fileId,
          item.driveFile.folderId,
          item.driveFile.url
        );
        insertedIds.push(result.lastID);
      }

      await db.exec('COMMIT');
    } catch (error) {
      try {
        await db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error(rollbackError);
      }

      if (insertedIds.length) {
        const placeholders = insertedIds.map(() => '?').join(', ');
        try {
          await db.run(`DELETE FROM usuario_arquivos WHERE id IN (${placeholders})`, insertedIds);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      await Promise.allSettled(uploadedFiles.map((item) => deleteDriveFile(item.driveFile.fileId)));
      throw normalizeDriveError(error);
    }

    const placeholders = insertedIds.map(() => '?').join(', ');
    const savedFiles = await db.all(
      `SELECT ua.*, up.nome AS pasta_nome
       FROM usuario_arquivos ua
       LEFT JOIN usuario_pastas up ON up.id = ua.pasta_id
       WHERE ua.id IN (${placeholders})
       ORDER BY ua.criado_em DESC, ua.id DESC`,
      insertedIds
    );

    res.status(201).json(savedFiles);
  })
);

userAreaRoutes.delete(
  '/files/:fileId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const file = await db.get(
      'SELECT * FROM usuario_arquivos WHERE id = ? AND usuario_id = ?',
      req.params.fileId,
      req.user.id
    );

    if (!file) {
      return res.status(404).json({ message: 'Arquivo nao encontrado.' });
    }

    await deleteDriveFile(file.drive_file_id);
    await db.run('DELETE FROM usuario_arquivos WHERE id = ? AND usuario_id = ?', req.params.fileId, req.user.id);
    res.status(204).send();
  })
);

userAreaRoutes.post(
  '/notes',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const titulo = normalizeText(req.body.titulo, 'Titulo da nota');
    const conteudo = String(req.body.conteudo || '');

    const result = await db.run(
      `INSERT INTO usuario_notas (usuario_id, titulo, conteudo)
       VALUES (?, ?, ?)`,
      req.user.id,
      titulo,
      conteudo
    );

    const note = await db.get('SELECT * FROM usuario_notas WHERE id = ? AND usuario_id = ?', result.lastID, req.user.id);
    res.status(201).json(note);
  })
);

userAreaRoutes.put(
  '/notes/:noteId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const titulo = normalizeText(req.body.titulo, 'Titulo da nota');
    const conteudo = String(req.body.conteudo || '');
    const currentNote = await db.get(
      'SELECT id FROM usuario_notas WHERE id = ? AND usuario_id = ?',
      req.params.noteId,
      req.user.id
    );

    if (!currentNote) {
      return res.status(404).json({ message: 'Nota nao encontrada.' });
    }

    await db.run(
      `UPDATE usuario_notas
       SET titulo = ?, conteudo = ?, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ? AND usuario_id = ?`,
      titulo,
      conteudo,
      req.params.noteId,
      req.user.id
    );

    const note = await db.get('SELECT * FROM usuario_notas WHERE id = ? AND usuario_id = ?', req.params.noteId, req.user.id);
    res.json(note);
  })
);

userAreaRoutes.delete(
  '/notes/:noteId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const note = await db.get(
      'SELECT id FROM usuario_notas WHERE id = ? AND usuario_id = ?',
      req.params.noteId,
      req.user.id
    );

    if (!note) {
      return res.status(404).json({ message: 'Nota nao encontrada.' });
    }

    await db.run('DELETE FROM usuario_notas WHERE id = ? AND usuario_id = ?', req.params.noteId, req.user.id);
    res.status(204).send();
  })
);
