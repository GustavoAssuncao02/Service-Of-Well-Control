import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const classModalityRoutes = Router();

classModalityRoutes.use(authenticate, requireAdmin);

function normalizeClassModality(payload) {
  const nome = String(payload.nome || '').trim();
  const descricao = String(payload.descricao || '').trim();

  return {
    nome,
    descricao: descricao || null
  };
}

function validateClassModality(data) {
  if (!data.nome) {
    const error = new Error('Nome da modalidade e obrigatorio.');
    error.status = 400;
    throw error;
  }
}

classModalityRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const modalities = await db.all(
      `SELECT cp.id,
              cp.nome,
              cp.descricao,
              cp.criado_em,
              cp.atualizado_em,
              COUNT(DISTINCT ta.aluno_id) AS total_alunos,
              COUNT(DISTINCT ta.turma_id) AS total_turmas
       FROM classificacoes_presenca cp
       LEFT JOIN turma_alunos ta ON ta.classificacao_presenca_id = cp.id
       GROUP BY cp.id
       ORDER BY cp.nome ASC`
    );

    res.json(modalities);
  })
);

classModalityRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const data = normalizeClassModality(req.body);
    validateClassModality(data);

    const result = await db.run(
      `INSERT INTO classificacoes_presenca (nome, descricao)
       VALUES (?, ?)`,
      data.nome,
      data.descricao
    );
    const modality = await db.get('SELECT id, nome, descricao, criado_em, atualizado_em FROM classificacoes_presenca WHERE id = ?', result.lastID);
    res.status(201).json(modality);
  })
);

classModalityRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const data = normalizeClassModality(req.body);
    validateClassModality(data);

    const existingModality = await db.get('SELECT id FROM classificacoes_presenca WHERE id = ?', req.params.id);
    if (!existingModality) {
      return res.status(404).json({ message: 'Modalidade nao encontrada.' });
    }

    await db.run(
      `UPDATE classificacoes_presenca
       SET nome = ?, descricao = ?, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ?`,
      data.nome,
      data.descricao,
      req.params.id
    );

    const modality = await db.get('SELECT id, nome, descricao, criado_em, atualizado_em FROM classificacoes_presenca WHERE id = ?', req.params.id);
    res.json(modality);
  })
);

classModalityRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const modality = await db.get('SELECT id FROM classificacoes_presenca WHERE id = ?', req.params.id);

    if (!modality) {
      return res.status(404).json({ message: 'Modalidade nao encontrada.' });
    }

    const usage = await db.get('SELECT COUNT(*) AS total FROM turma_alunos WHERE classificacao_presenca_id = ?', req.params.id);
    if (usage.total > 0) {
      return res.status(409).json({ message: 'Esta modalidade esta vinculada a um ou mais alunos em turmas.' });
    }

    await db.run('DELETE FROM classificacoes_presenca WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
