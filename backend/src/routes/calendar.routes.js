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
              COALESCE(alunos.alunos_presenciais, 0) AS alunos_presenciais,
              COALESCE(alunos.alunos_online, 0) AS alunos_online,
              alunos.aluno_ids,
              alunos.aluno_ids_presenciais,
              alunos.aluno_ids_online
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       LEFT JOIN locais local_por_id
         ON TRIM(t.local) REGEXP '^[0-9]+$'
        AND local_por_id.id = CAST(TRIM(t.local) AS UNSIGNED)
       LEFT JOIN locais local_por_nome ON local_por_nome.nome = t.local
       LEFT JOIN (
         SELECT ta.turma_id,
                COUNT(*) AS total_alunos,
                COUNT(DISTINCT CASE WHEN cp.nome LIKE 'Presencial%' THEN ta.aluno_id END) AS alunos_presenciais,
                COUNT(DISTINCT CASE WHEN cp.nome LIKE 'Online%' THEN ta.aluno_id END) AS alunos_online,
                GROUP_CONCAT(DISTINCT ta.aluno_id ORDER BY ta.aluno_id) AS aluno_ids,
                GROUP_CONCAT(DISTINCT CASE WHEN cp.nome LIKE 'Presencial%' THEN ta.aluno_id END ORDER BY ta.aluno_id) AS aluno_ids_presenciais,
                GROUP_CONCAT(DISTINCT CASE WHEN cp.nome LIKE 'Online%' THEN ta.aluno_id END ORDER BY ta.aluno_id) AS aluno_ids_online
         FROM turma_alunos ta
         LEFT JOIN classificacoes_presenca cp ON cp.id = ta.classificacao_presenca_id
         GROUP BY ta.turma_id
       ) alunos ON alunos.turma_id = t.id
       WHERE t.data_inicio <= ? AND t.data_fim >= ?
       ORDER BY t.data_inicio ASC`,
      end,
      start
    );

    res.json({ start, end, classes });
  })
);
