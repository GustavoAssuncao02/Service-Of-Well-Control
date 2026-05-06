import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const instructorRoutes = Router();

instructorRoutes.use(authenticate, requireAdmin);

instructorRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const instructors = await db.all('SELECT * FROM instrutores ORDER BY nome ASC');
    res.json(instructors);
  })
);

instructorRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ message: 'Nome do instrutor é obrigatório.' });
    }

    const result = await db.run('INSERT INTO instrutores (nome) VALUES (?)', nome);
    const instructor = await db.get('SELECT * FROM instrutores WHERE id = ?', result.lastID);
    res.status(201).json(instructor);
  })
);

instructorRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ message: 'Nome do instrutor é obrigatório.' });
    }

    await db.run('UPDATE instrutores SET nome = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', nome, req.params.id);
    const instructor = await db.get('SELECT * FROM instrutores WHERE id = ?', req.params.id);
    res.json(instructor);
  })
);

instructorRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.run('DELETE FROM instrutores WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
