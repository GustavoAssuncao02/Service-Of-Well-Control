import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const onlineRoomRoutes = Router();

onlineRoomRoutes.use(authenticate, requireAdmin);

function normalizeOnlineRoomName(name) {
  return String(name || '').trim();
}

onlineRoomRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const rooms = await db.all(
      `SELECT so.*,
              COUNT(t.id) AS total_turmas
       FROM salas_online so
       LEFT JOIN turmas t ON t.sala_online = so.nome
       GROUP BY so.id
       ORDER BY so.nome ASC`
    );

    res.json(rooms);
  })
);

onlineRoomRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeOnlineRoomName(req.body.nome);

    if (!nome) {
      return res.status(400).json({ message: 'Nome da sala online é obrigatório.' });
    }

    const result = await db.run('INSERT INTO salas_online (nome) VALUES (?)', nome);
    const room = await db.get('SELECT * FROM salas_online WHERE id = ?', result.lastID);
    res.status(201).json(room);
  })
);

onlineRoomRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeOnlineRoomName(req.body.nome);

    if (!nome) {
      return res.status(400).json({ message: 'Nome da sala online é obrigatório.' });
    }

    const existingRoom = await db.get('SELECT * FROM salas_online WHERE id = ?', req.params.id);
    if (!existingRoom) {
      return res.status(404).json({ message: 'Sala online não encontrada.' });
    }

    await db.exec('BEGIN');
    try {
      await db.run('UPDATE salas_online SET nome = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', nome, req.params.id);
      await db.run('UPDATE turmas SET sala_online = ?, atualizado_em = CURRENT_TIMESTAMP WHERE sala_online = ?', nome, existingRoom.nome);
      await db.exec('COMMIT');

      const room = await db.get('SELECT * FROM salas_online WHERE id = ?', req.params.id);
      res.json(room);
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  })
);

onlineRoomRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const room = await db.get('SELECT * FROM salas_online WHERE id = ?', req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Sala online não encontrada.' });
    }

    const usage = await db.get('SELECT COUNT(*) AS total FROM turmas WHERE sala_online = ?', room.nome);
    if (usage.total > 0) {
      return res.status(409).json({ message: 'Esta sala online está vinculada a uma ou mais turmas.' });
    }

    await db.run('DELETE FROM salas_online WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
