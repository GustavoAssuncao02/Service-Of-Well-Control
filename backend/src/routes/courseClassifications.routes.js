import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const courseClassificationRoutes = Router();

courseClassificationRoutes.use(authenticate, requireAdmin);

function normalizeText(value) {
  return String(value || '').trim();
}

courseClassificationRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const classifications = await db.all(
      `SELECT cc.*,
              COUNT(c.id) AS total_cursos
       FROM classificacoes_cursos cc
       LEFT JOIN cursos c ON c.classificacao_id = cc.id
       GROUP BY cc.id
       ORDER BY cc.nome ASC`
    );

    res.json(classifications);
  })
);

courseClassificationRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeText(req.body.nome);
    const descricao = normalizeText(req.body.descricao);

    if (!nome) {
      return res.status(400).json({ message: 'Nome da classificação é obrigatório.' });
    }

    const result = await db.run(
      'INSERT INTO classificacoes_cursos (nome, descricao) VALUES (?, ?)',
      nome,
      descricao || null
    );
    const classification = await db.get('SELECT * FROM classificacoes_cursos WHERE id = ?', result.lastID);
    res.status(201).json(classification);
  })
);

courseClassificationRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeText(req.body.nome);
    const descricao = normalizeText(req.body.descricao);

    if (!nome) {
      return res.status(400).json({ message: 'Nome da classificação é obrigatório.' });
    }

    const existingClassification = await db.get('SELECT * FROM classificacoes_cursos WHERE id = ?', req.params.id);
    if (!existingClassification) {
      return res.status(404).json({ message: 'Classificação não encontrada.' });
    }

    await db.run(
      'UPDATE classificacoes_cursos SET nome = ?, descricao = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
      nome,
      descricao || null,
      req.params.id
    );

    const classification = await db.get('SELECT * FROM classificacoes_cursos WHERE id = ?', req.params.id);
    res.json(classification);
  })
);

courseClassificationRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const classification = await db.get('SELECT * FROM classificacoes_cursos WHERE id = ?', req.params.id);

    if (!classification) {
      return res.status(404).json({ message: 'Classificação não encontrada.' });
    }

    const usage = await db.get('SELECT COUNT(*) AS total FROM cursos WHERE classificacao_id = ?', req.params.id);
    if (usage.total > 0) {
      return res.status(409).json({ message: 'Esta classificação está vinculada a um ou mais cursos.' });
    }

    await db.run('DELETE FROM classificacoes_cursos WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
