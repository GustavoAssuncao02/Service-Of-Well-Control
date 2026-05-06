import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const courseRoutes = Router();

courseRoutes.use(authenticate, requireAdmin);

async function getCourseById(db, id) {
  return db.get(
    `SELECT c.*,
            cc.nome AS classificacao_nome
     FROM cursos c
     JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
     WHERE c.id = ?`,
    id
  );
}

async function validateClassification(db, classificationId) {
  if (!classificationId) {
    return null;
  }

  return db.get('SELECT id FROM classificacoes_cursos WHERE id = ?', classificationId);
}

courseRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const courses = await db.all(
      `SELECT c.*,
              MAX(cc.nome) AS classificacao_nome,
              COUNT(t.id) AS total_turmas,
              SUM(CASE WHEN t.status = 'Em andamento' THEN 1 ELSE 0 END) AS turmas_ativas,
              SUM(CASE WHEN t.status = 'Concluído' THEN 1 ELSE 0 END) AS turmas_concluidas
       FROM cursos c
       JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
       LEFT JOIN turmas t ON t.curso_id = c.id
       GROUP BY c.id
       ORDER BY c.nome ASC`
    );

    res.json(courses);
  })
);

courseRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { nome, descricao, classificacao_id } = req.body;

    if (!nome || !descricao || !classificacao_id) {
      return res.status(400).json({ message: 'Nome, descrição e classificação são obrigatórios.' });
    }

    const classification = await validateClassification(db, classificacao_id);
    if (!classification) {
      return res.status(404).json({ message: 'Classificação não encontrada.' });
    }

    const result = await db.run('INSERT INTO cursos (nome, classificacao_id, descricao) VALUES (?, ?, ?)', nome, classificacao_id, descricao);
    const course = await getCourseById(db, result.lastID);
    res.status(201).json(course);
  })
);

courseRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { nome, descricao, classificacao_id } = req.body;

    if (!nome || !descricao || !classificacao_id) {
      return res.status(400).json({ message: 'Nome, descrição e classificação são obrigatórios.' });
    }

    const classification = await validateClassification(db, classificacao_id);
    if (!classification) {
      return res.status(404).json({ message: 'Classificação não encontrada.' });
    }

    await db.run(
      'UPDATE cursos SET nome = ?, classificacao_id = ?, descricao = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
      nome,
      classificacao_id,
      descricao,
      req.params.id
    );
    const course = await getCourseById(db, req.params.id);
    res.json(course);
  })
);

courseRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.run('DELETE FROM cursos WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
