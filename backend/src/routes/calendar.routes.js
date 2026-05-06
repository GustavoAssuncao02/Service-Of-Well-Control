import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const calendarRoutes = Router();

calendarRoutes.use(authenticate, requireAdmin);

function monthRange(month) {
  const [year, monthNumber] = String(month || '').split('-').map(Number);

  if (!year || !monthNumber) {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    return monthRange(`${now.getFullYear()}-${currentMonth}`);
  }

  const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
  const endDate = new Date(year, monthNumber, 0);
  const end = `${year}-${String(monthNumber).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  return { start, end };
}

calendarRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { start, end } = monthRange(req.query.month);
    const classes = await db.all(
      `SELECT t.id, t.data_inicio, t.data_fim, t.status,
              COALESCE(local_por_id.nome, local_por_nome.nome, t.local) AS local,
              t.sala_online,
              c.nome AS curso_nome, i.nome AS instrutor_nome,
              COALESCE(alunos.total_alunos, 0) AS total_alunos,
              alunos.aluno_ids
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       LEFT JOIN locais local_por_id
         ON TRIM(t.local) REGEXP '^[0-9]+$'
        AND local_por_id.id = CAST(TRIM(t.local) AS UNSIGNED)
       LEFT JOIN locais local_por_nome ON local_por_nome.nome = t.local
       LEFT JOIN (
         SELECT turma_id,
                COUNT(*) AS total_alunos,
                GROUP_CONCAT(DISTINCT aluno_id ORDER BY aluno_id) AS aluno_ids
         FROM turma_alunos
         GROUP BY turma_id
       ) alunos ON alunos.turma_id = t.id
       WHERE DATE(t.data_inicio) <= DATE(?) AND DATE(t.data_fim) >= DATE(?)
       ORDER BY DATE(t.data_inicio) ASC`,
      end,
      start
    );

    res.json({ start, end, classes });
  })
);
