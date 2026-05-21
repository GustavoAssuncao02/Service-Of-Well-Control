import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const historyRoutes = Router();

historyRoutes.use(authenticate, requireAdmin);

historyRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const clauses = [];
    const params = [];

    if (req.query.date) {
      clauses.push('(t.data_inicio <= ? AND t.data_fim >= ?)');
      params.push(req.query.date, req.query.date);
    }

    if (req.query.startDate) {
      clauses.push('t.data_fim >= ?');
      params.push(req.query.startDate);
    }

    if (req.query.endDate) {
      clauses.push('t.data_inicio <= ?');
      params.push(req.query.endDate);
    }

    if (req.query.student) {
      clauses.push('(a.nome_completo LIKE ? OR a.cpf LIKE ?)');
      params.push(`%${req.query.student}%`, `%${req.query.student}%`);
    }

    if (req.query.status) {
      clauses.push('ta.status = ?');
      params.push(req.query.status);
    }

    if (req.query.courseId) {
      clauses.push('t.curso_id = ?');
      params.push(req.query.courseId);
    }

    if (req.query.instructorId) {
      clauses.push('t.instrutor_id = ?');
      params.push(req.query.instructorId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await db.all(
      `SELECT ta.id, ta.status, ta.matriculado_em, ta.concluido_em,
              a.id AS aluno_id, a.nome_completo AS aluno_nome, a.cpf,
              c.nome AS curso_nome,
              t.id AS turma_id, t.data_inicio, t.data_fim,
              i.nome AS instrutor_nome
       FROM turma_alunos ta
       JOIN alunos a ON a.id = ta.aluno_id
       JOIN turmas t ON t.id = ta.turma_id
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       ${where}
       ORDER BY t.data_inicio DESC, a.nome_completo ASC`,
      params
    );

    res.json(rows);
  })
);
