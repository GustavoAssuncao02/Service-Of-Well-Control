import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const locationRoutes = Router();

locationRoutes.use(authenticate, requireAdmin);

function normalizeLocationName(name) {
  return String(name || '').trim();
}

locationRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const locations = await db.all(
      `SELECT l.*,
              COUNT(t.id) AS total_turmas
       FROM locais l
       LEFT JOIN turmas t ON t.local = l.nome
       GROUP BY l.id
       ORDER BY l.nome ASC`
    );

    res.json(locations);
  })
);

locationRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeLocationName(req.body.nome);

    if (!nome) {
      return res.status(400).json({ message: 'Nome do local é obrigatório.' });
    }

    const result = await db.run('INSERT INTO locais (nome) VALUES (?)', nome);
    const location = await db.get('SELECT * FROM locais WHERE id = ?', result.lastID);
    res.status(201).json(location);
  })
);

locationRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeLocationName(req.body.nome);

    if (!nome) {
      return res.status(400).json({ message: 'Nome do local é obrigatório.' });
    }

    const existingLocation = await db.get('SELECT * FROM locais WHERE id = ?', req.params.id);
    if (!existingLocation) {
      return res.status(404).json({ message: 'Local não encontrado.' });
    }

    await db.exec('BEGIN');
    try {
      await db.run('UPDATE locais SET nome = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', nome, req.params.id);
      await db.run('UPDATE turmas SET local = ?, atualizado_em = CURRENT_TIMESTAMP WHERE local = ?', nome, existingLocation.nome);
      await db.exec('COMMIT');

      const location = await db.get('SELECT * FROM locais WHERE id = ?', req.params.id);
      res.json(location);
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  })
);

locationRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const location = await db.get('SELECT * FROM locais WHERE id = ?', req.params.id);

    if (!location) {
      return res.status(404).json({ message: 'Local não encontrado.' });
    }

    const usage = await db.get('SELECT COUNT(*) AS total FROM turmas WHERE local = ?', location.nome);
    if (usage.total > 0) {
      return res.status(409).json({ message: 'Este local está vinculado a uma ou mais turmas.' });
    }

    await db.run('DELETE FROM locais WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
