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

    const activeCourses = await db.get("SELECT COUNT(*) AS total FROM turmas WHERE status = 'Em andamento'");
    const completedCourses = await db.get("SELECT COUNT(*) AS total FROM turmas WHERE status LIKE 'Conclu%'");
    const totalStudents = await db.get('SELECT COUNT(*) AS total FROM alunos');
    const totalClasses = await db.get('SELECT COUNT(*) AS total FROM turmas');
    const currentMonthStudents = await db.get(
      "SELECT COUNT(*) AS total FROM alunos WHERE DATE_FORMAT(criado_em, '%Y-%m') = DATE_FORMAT(CURRENT_DATE, '%Y-%m')"
    );
    const lastMonthStudents = await db.get(
      "SELECT COUNT(*) AS total FROM alunos WHERE DATE_FORMAT(criado_em, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m')"
    );
    const previousMonthStudents = await db.get(
      "SELECT COUNT(*) AS total FROM alunos WHERE DATE_FORMAT(criado_em, '%Y-%m') = DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 2 MONTH), '%Y-%m')"
    );
    const averageStudentsPerMonth = await db.get(
      `SELECT AVG(total) AS total
       FROM (
         SELECT DATE_FORMAT(criado_em, '%Y-%m') AS periodo, COUNT(*) AS total
         FROM alunos
         GROUP BY periodo
       ) monthly_students`
    );

    const courseDistribution = await db.all(
      `SELECT c.nome, COUNT(t.id) AS total
       FROM cursos c
       LEFT JOIN turmas t ON t.curso_id = c.id
       GROUP BY c.id
       ORDER BY total DESC, c.nome ASC`
    );

    const courseFrequency = await db.all(
      `SELECT c.nome, cc.nome AS tipo, COUNT(t.id) AS total
       FROM cursos c
       LEFT JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
       LEFT JOIN turmas t ON t.curso_id = c.id
       GROUP BY c.id
       ORDER BY total DESC, c.nome ASC`
    );

    const sponsorDistribution = await db.all(
      `SELECT COALESCE(a.responsavel_inscricao, 'Particular') AS tipo, COUNT(ta.id) AS total
       FROM turma_alunos ta
       JOIN alunos a ON a.id = ta.aluno_id
       GROUP BY COALESCE(a.responsavel_inscricao, 'Particular')
       ORDER BY total DESC`
    );

    const studentEvolution = await db.all(
      `SELECT DATE_FORMAT(criado_em, '%Y-%m') AS periodo, COUNT(*) AS total
       FROM alunos
       GROUP BY periodo
       ORDER BY periodo ASC`
    );

    const upcomingClasses = await db.all(
      `SELECT t.id, t.data_inicio, t.data_fim, t.status,
              c.nome AS curso_nome, i.nome AS instrutor_nome
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       ORDER BY DATE(t.data_inicio) DESC
       LIMIT 6`
    );

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
      studentEvolution,
      upcomingClasses
    });
  })
);
