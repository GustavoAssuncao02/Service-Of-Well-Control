import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate, requireAdmin);

dashboardRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();

    const [
      activeCourses,
      completedCourses,
      totalStudents,
      totalClasses,
      currentMonthStudents,
      lastMonthStudents,
      previousMonthStudents,
      averageStudentsPerMonth,
      courseDistribution,
      courseFrequency,
      sponsorDistribution,
      companyRows,
      classModalityDistribution,
      classModalityUsage,
      studentEvolution,
      upcomingClasses
    ] = await Promise.all([
      db.get("SELECT COUNT(*) AS total FROM turmas WHERE status = 'Em andamento'"),
      db.get("SELECT COUNT(*) AS total FROM turmas WHERE status LIKE 'Conclu%'"),
      db.get('SELECT COUNT(*) AS total FROM alunos'),
      db.get('SELECT COUNT(*) AS total FROM turmas'),
      db.get(
        `SELECT COUNT(*) AS total
         FROM alunos
         WHERE criado_em >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
           AND criado_em < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)`
      ),
      db.get(
        `SELECT COUNT(*) AS total
         FROM alunos
         WHERE criado_em >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)
           AND criado_em < DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')`
      ),
      db.get(
        `SELECT COUNT(*) AS total
         FROM alunos
         WHERE criado_em >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 2 MONTH)
           AND criado_em < DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)`
      ),
      db.get(
        `SELECT AVG(total) AS total
         FROM (
           SELECT DATE_FORMAT(criado_em, '%Y-%m') AS periodo, COUNT(*) AS total
           FROM alunos
           GROUP BY periodo
         ) monthly_students`
      ),
      db.all(
        `SELECT c.nome, COUNT(t.id) AS total
         FROM cursos c
         LEFT JOIN turmas t ON t.curso_id = c.id
         GROUP BY c.id
         ORDER BY total DESC, c.nome ASC`
      ),
      db.all(
        `SELECT c.nome, cc.nome AS tipo, COUNT(t.id) AS total
         FROM cursos c
         LEFT JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
         LEFT JOIN turmas t ON t.curso_id = c.id
         GROUP BY c.id
         ORDER BY total DESC, c.nome ASC`
      ),
      db.all(
        `SELECT COALESCE(a.responsavel_inscricao, 'Particular') AS tipo, COUNT(ta.id) AS total
         FROM turma_alunos ta
         JOIN alunos a ON a.id = ta.aluno_id
         GROUP BY COALESCE(a.responsavel_inscricao, 'Particular')
         ORDER BY total DESC`
      ),
      db.all(
        `SELECT empresa, COUNT(*) AS total
         FROM (
           SELECT COALESCE(e.nome, NULLIF(TRIM(a.empresa), '')) AS empresa
           FROM alunos a
           LEFT JOIN empresas e ON e.id = a.empresa_id
         ) company_base
         WHERE empresa IS NOT NULL
         GROUP BY empresa
         ORDER BY total DESC, empresa ASC`
      ),
      db.all(
        `SELECT cp.nome AS modalidade, COUNT(DISTINCT ta.aluno_id) AS total
         FROM turma_alunos ta
         JOIN classificacoes_presenca cp ON cp.id = ta.classificacao_presenca_id
         GROUP BY cp.id
         ORDER BY total DESC, cp.nome ASC`
      ),
      db.all(
        `SELECT cp.nome AS modalidade, COUNT(DISTINCT ta.aluno_id) AS total
         FROM classificacoes_presenca cp
         LEFT JOIN turma_alunos ta ON ta.classificacao_presenca_id = cp.id
         GROUP BY cp.id
         ORDER BY total DESC, cp.nome ASC`
      ),
      db.all(
        `SELECT DATE_FORMAT(criado_em, '%Y-%m') AS periodo, COUNT(*) AS total
         FROM alunos
         GROUP BY periodo
         ORDER BY periodo ASC`
      ),
      db.all(
        `SELECT t.id, t.data_inicio, t.data_fim, t.status,
                c.nome AS curso_nome, i.nome AS instrutor_nome
         FROM turmas t
         JOIN cursos c ON c.id = t.curso_id
         JOIN instrutores i ON i.id = t.instrutor_id
         ORDER BY t.data_inicio DESC
         LIMIT 6`
      )
    ]);
    const companyTotal = companyRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const companyDistribution = companyRows.map((item) => ({
      ...item,
      percentual: companyTotal ? Number(((Number(item.total || 0) * 100) / companyTotal).toFixed(2)) : 0
    }));

    res.json({
      activeCourses: activeCourses.total || 0,
      completedCourses: completedCourses.total || 0,
      totalStudents: totalStudents.total || 0,
      totalClasses: totalClasses.total || 0,
      currentMonthStudents: currentMonthStudents.total || 0,
      lastMonthStudents: lastMonthStudents.total || 0,
      lastMonthStudentVariation: previousMonthStudents.total
        ? Number((((lastMonthStudents.total || 0) - previousMonthStudents.total) / previousMonthStudents.total) * 100).toFixed(1)
        : lastMonthStudents.total
          ? 100
          : 0,
      averageStudentsPerMonth: Number(averageStudentsPerMonth.total || 0).toFixed(1),
      courseDistribution,
      courseFrequency,
      sponsorDistribution,
      companyDistribution,
      classModalityDistribution,
      classModalityUsage,
      attendanceDistribution: classModalityDistribution,
      attendanceClassificationDistribution: classModalityUsage,
      studentEvolution,
      upcomingClasses
    });
  })
);
