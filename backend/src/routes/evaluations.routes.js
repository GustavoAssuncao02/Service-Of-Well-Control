import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const evaluationRoutes = Router();

evaluationRoutes.use(authenticate, requireAdmin);

const criteriaAverageSql = Array.from({ length: 14 }, (_, index) => `ROUND(AVG(av.nota_${index + 1}), 2) AS nota_${index + 1}`).join(', ');

function buildWhere(query, alias = 'av') {
  const clauses = [];
  const params = [];

  if (query.courseId) {
    clauses.push(`${alias}.curso_id = ?`);
    params.push(query.courseId);
  }

  if (query.instructorId) {
    clauses.push(`${alias}.instrutor_id = ?`);
    params.push(query.instructorId);
  }

  if (query.classId) {
    clauses.push(`${alias}.turma_id = ?`);
    params.push(query.classId);
  }

  if (query.startDate) {
    clauses.push(`DATE(${alias}.data_avaliacao) >= DATE(?)`);
    params.push(query.startDate);
  }

  if (query.endDate) {
    clauses.push(`DATE(${alias}.data_avaliacao) <= DATE(?)`);
    params.push(query.endDate);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

function buildEvaluationReportWhere(query) {
  const clauses = [];
  const params = [];

  const search = String(query.search || '').trim();
  if (search) {
    const term = `%${search}%`;
    const digits = search.replace(/\D/g, '');
    const digitTerm = `%${digits || search}%`;
    clauses.push(
      `(a.nome_completo LIKE ?
        OR a.cpf LIKE ?
        OR REPLACE(REPLACE(REPLACE(a.cpf, '.', ''), '-', ''), ' ', '') LIKE ?
        OR a.email LIKE ?
        OR a.telefone LIKE ?
        OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(a.telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') LIKE ?)`
    );
    params.push(term, term, digitTerm, term, term, digitTerm);
  }

  if (query.courseId) {
    clauses.push('av.curso_id = ?');
    params.push(query.courseId);
  }

  if (query.instructorId) {
    clauses.push('av.instrutor_id = ?');
    params.push(query.instructorId);
  }

  if (query.classId) {
    clauses.push('av.turma_id = ?');
    params.push(query.classId);
  }

  if (query.startDate) {
    clauses.push('DATE(av.data_avaliacao) >= DATE(?)');
    params.push(query.startDate);
  }

  if (query.endDate) {
    clauses.push('DATE(av.data_avaliacao) <= DATE(?)');
    params.push(query.endDate);
  }

  if (query.classStartFrom) {
    clauses.push('DATE(t.data_inicio) >= DATE(?)');
    params.push(query.classStartFrom);
  }

  if (query.classStartTo) {
    clauses.push('DATE(t.data_inicio) <= DATE(?)');
    params.push(query.classStartTo);
  }

  if (query.testZoom) {
    clauses.push('av.teste_zoom = ?');
    params.push(query.testZoom);
  }

  if (query.hasComment === 'yes') {
    clauses.push("av.comentario IS NOT NULL AND TRIM(av.comentario) <> ''");
  } else if (query.hasComment === 'no') {
    clauses.push("(av.comentario IS NULL OR TRIM(av.comentario) = '')");
  }

  if (query.minScore) {
    clauses.push('av.nota_geral >= ?');
    params.push(Number(query.minScore));
  }

  if (query.maxScore) {
    clauses.push('av.nota_geral <= ?');
    params.push(Number(query.maxScore));
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

const evaluationReportJoins = `
       JOIN alunos a ON a.id = av.aluno_id
       JOIN cursos c ON c.id = av.curso_id
       JOIN instrutores i ON i.id = av.instrutor_id
       JOIN turmas t ON t.id = av.turma_id`;

evaluationRoutes.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { where, params } = buildEvaluationReportWhere(req.query);

    const overall = await db.get(
      `SELECT ROUND(AVG(av.nota_geral), 2) AS media_geral,
              COUNT(av.id) AS total_avaliacoes
       FROM avaliacoes av
       ${evaluationReportJoins}
       ${where}`,
      params
    );

    const byCourse = await db.all(
      `SELECT c.id, c.nome, ROUND(AVG(av.nota_geral), 2) AS media, COUNT(av.id) AS total
       FROM avaliacoes av
       ${evaluationReportJoins}
       ${where}
       GROUP BY c.id, c.nome
       ORDER BY media DESC, c.nome ASC`,
      params
    );

    const byInstructor = await db.all(
      `SELECT i.id, i.nome, ROUND(AVG(av.nota_geral), 2) AS media, COUNT(av.id) AS total
       FROM avaliacoes av
       ${evaluationReportJoins}
       ${where}
       GROUP BY i.id, i.nome
       ORDER BY media DESC, i.nome ASC`,
      params
    );

    const evolution = await db.all(
      `SELECT DATE_FORMAT(av.data_avaliacao, '%Y-%m') AS periodo,
              ROUND(AVG(av.nota_geral), 2) AS media,
              COUNT(av.id) AS total
       FROM avaliacoes av
       ${evaluationReportJoins}
       ${where}
       GROUP BY periodo
       ORDER BY periodo ASC`,
      params
    );

    const distribution = await db.all(
      `SELECT CAST(ROUND(av.nota_geral) AS SIGNED) AS nota,
              COUNT(av.id) AS total
       FROM avaliacoes av
       ${evaluationReportJoins}
       ${where}
       GROUP BY nota
       ORDER BY nota ASC`,
      params
    );

    const zoomTestRows = await db.all(
      `SELECT av.teste_zoom AS status,
              COUNT(av.id) AS total
       FROM avaliacoes av
       ${evaluationReportJoins}
       ${where}
       GROUP BY av.teste_zoom
       ORDER BY FIELD(av.teste_zoom, 'Sim', 'Não')`,
      params
    );

    const zoomTestTotal = zoomTestRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const zoomTest = ['Sim', 'Não'].map((status) => {
      const row = zoomTestRows.find((item) => item.status === status);
      const total = Number(row?.total || 0);

      return {
        status,
        label: status === 'Sim' ? 'Fez teste no Zoom' : 'Não fez teste no Zoom',
        total,
        percentual: zoomTestTotal ? Number(((total * 100) / zoomTestTotal).toFixed(2)) : 0
      };
    });

    const criteria = await db.get(
      `SELECT ${criteriaAverageSql}
       FROM avaliacoes av
       ${evaluationReportJoins}
       ${where}`,
      params
    );

    const responseClauses = ["rt.status LIKE 'Conclu%'"];
    const responseParams = [];

    if (req.query.courseId) {
      responseClauses.push('rt.curso_id = ?');
      responseParams.push(req.query.courseId);
    }

    if (req.query.instructorId) {
      responseClauses.push('rt.instrutor_id = ?');
      responseParams.push(req.query.instructorId);
    }

    if (req.query.classId) {
      responseClauses.push('rt.id = ?');
      responseParams.push(req.query.classId);
    }

    if (req.query.classStartFrom) {
      responseClauses.push('DATE(rt.data_inicio) >= DATE(?)');
      responseParams.push(req.query.classStartFrom);
    }

    if (req.query.classStartTo) {
      responseClauses.push('DATE(rt.data_inicio) <= DATE(?)');
      responseParams.push(req.query.classStartTo);
    }

    const hasEvaluationScopedResponseFilter = ['search', 'startDate', 'endDate', 'testZoom', 'hasComment', 'minScore', 'maxScore'].some((key) =>
      Boolean(req.query[key])
    );

    if (hasEvaluationScopedResponseFilter) {
      const correlatedWhere = where
        ? where.replace(/^WHERE\s+/i, 'WHERE av.turma_id = rt.id AND ')
        : 'WHERE av.turma_id = rt.id';
      responseClauses.push(`EXISTS (
        SELECT 1
        FROM avaliacoes av
        ${evaluationReportJoins}
        ${correlatedWhere}
      )`);
      responseParams.push(...params);
    }

    const responseRate = await db.all(
      `SELECT rt.id, rc.nome AS curso_nome, rt.data_inicio, rt.data_fim,
              COUNT(DISTINCT ta.aluno_id) AS total_alunos,
              COUNT(DISTINCT av.id) AS total_respostas,
              ROUND(COUNT(DISTINCT av.id) * 100.0 / NULLIF(COUNT(DISTINCT ta.aluno_id), 0), 2) AS taxa_resposta
       FROM turmas rt
       JOIN cursos rc ON rc.id = rt.curso_id
       LEFT JOIN turma_alunos ta ON ta.turma_id = rt.id
       LEFT JOIN avaliacoes av ON av.turma_id = rt.id AND av.aluno_id = ta.aluno_id
       WHERE ${responseClauses.join(' AND ')}
       GROUP BY rt.id, rc.nome, rt.data_inicio, rt.data_fim
       ORDER BY DATE(rt.data_fim) DESC`,
      responseParams
    );

    res.json({
      overall: {
        media_geral: overall.media_geral || 0,
        total_avaliacoes: overall.total_avaliacoes || 0
      },
      byCourse,
      byInstructor,
      evolution,
      distribution,
      zoomTest,
      criteria,
      responseRate
    });
  })
);

evaluationRoutes.get(
  '/report-options',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const zoomRows = await db.all(
      `SELECT DISTINCT teste_zoom AS value
       FROM avaliacoes
       WHERE teste_zoom IS NOT NULL AND TRIM(teste_zoom) <> ''
       ORDER BY FIELD(teste_zoom, 'Sim', 'Não'), teste_zoom ASC`
    );

    res.json({
      zoomTests: zoomRows.map((row) => row.value)
    });
  })
);

evaluationRoutes.get(
  '/report',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { where, params } = buildEvaluationReportWhere(req.query);

    const summary = await db.get(
      `SELECT COUNT(av.id) AS total_avaliacoes,
              ROUND(AVG(av.nota_geral), 2) AS media_geral,
              MIN(av.nota_geral) AS menor_nota,
              MAX(av.nota_geral) AS maior_nota,
              COUNT(DISTINCT av.curso_id) AS total_cursos,
              COUNT(DISTINCT av.instrutor_id) AS total_instrutores,
              COUNT(DISTINCT av.turma_id) AS total_turmas,
              SUM(CASE WHEN av.comentario IS NOT NULL AND TRIM(av.comentario) <> '' THEN 1 ELSE 0 END) AS total_comentarios,
              ${criteriaAverageSql}
       FROM avaliacoes av
       JOIN alunos a ON a.id = av.aluno_id
       JOIN cursos c ON c.id = av.curso_id
       JOIN instrutores i ON i.id = av.instrutor_id
       JOIN turmas t ON t.id = av.turma_id
       ${where}`,
      params
    );

    const evaluations = await db.all(
      `SELECT av.id,
              av.aluno_id,
              av.turma_id,
              av.curso_id,
              av.instrutor_id,
              av.data_avaliacao,
              av.nota_1,
              av.nota_2,
              av.nota_3,
              av.nota_4,
              av.nota_5,
              av.nota_6,
              av.nota_7,
              av.nota_8,
              av.nota_9,
              av.nota_10,
              av.nota_11,
              av.nota_12,
              av.nota_13,
              av.nota_14,
              av.nota_geral,
              av.teste_zoom,
              av.comentario,
              DATE(av.criado_em) AS data_cadastro,
              a.nome_completo AS aluno_nome,
              a.cpf,
              a.email AS aluno_email,
              a.telefone AS aluno_telefone,
              COALESCE(e.nome, a.empresa) AS empresa,
              a.cidade,
              a.estado,
              c.nome AS curso_nome,
              cc.nome AS classificacao_nome,
              i.nome AS instrutor_nome,
              t.data_inicio,
              t.data_fim,
              t.status AS turma_status,
              t.local,
              t.sala_online
       FROM avaliacoes av
       JOIN alunos a ON a.id = av.aluno_id
       LEFT JOIN empresas e ON e.id = a.empresa_id
       JOIN cursos c ON c.id = av.curso_id
       JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
       JOIN instrutores i ON i.id = av.instrutor_id
       JOIN turmas t ON t.id = av.turma_id
       ${where}
       ORDER BY DATE(av.data_avaliacao) DESC, a.nome_completo ASC`,
      params
    );

    res.json({
      summary: {
        total_avaliacoes: summary.total_avaliacoes || 0,
        media_geral: summary.media_geral || 0,
        menor_nota: summary.menor_nota || 0,
        maior_nota: summary.maior_nota || 0,
        total_cursos: summary.total_cursos || 0,
        total_instrutores: summary.total_instrutores || 0,
        total_turmas: summary.total_turmas || 0,
        total_comentarios: summary.total_comentarios || 0
      },
      criteria: Object.fromEntries(Array.from({ length: 14 }, (_, index) => [`nota_${index + 1}`, summary[`nota_${index + 1}`] || 0])),
      evaluations
    });
  })
);

evaluationRoutes.get(
  '/details',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { where, params } = buildWhere(req.query);

    const overall = await db.get(
      `SELECT ROUND(AVG(av.nota_geral), 2) AS media_geral,
              COUNT(av.id) AS total_avaliacoes
       FROM avaliacoes av
       ${where}`,
      params
    );

    const criteria = await db.get(
      `SELECT ${criteriaAverageSql}
       FROM avaliacoes av
       ${where}`,
      params
    );

    const evaluations = await db.all(
      `SELECT av.*, a.nome_completo AS aluno_nome, a.cpf,
              c.nome AS curso_nome, i.nome AS instrutor_nome,
              t.data_inicio, t.data_fim, t.local, t.sala_online
       FROM avaliacoes av
       JOIN alunos a ON a.id = av.aluno_id
       JOIN cursos c ON c.id = av.curso_id
       JOIN instrutores i ON i.id = av.instrutor_id
       JOIN turmas t ON t.id = av.turma_id
       ${where}
       ORDER BY DATE(av.data_avaliacao) DESC, a.nome_completo ASC`,
      params
    );

    res.json({
      overall: {
        media_geral: overall.media_geral || 0,
        total_avaliacoes: overall.total_avaliacoes || 0
      },
      criteria,
      evaluations
    });
  })
);

evaluationRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const evaluation = await db.get(
      `SELECT av.*, a.nome_completo AS aluno_nome, a.cpf,
              a.email AS aluno_email,
              a.telefone AS aluno_telefone,
              COALESCE(e.nome, a.empresa) AS empresa,
              a.cidade,
              a.estado,
              c.nome AS curso_nome,
              cc.nome AS classificacao_nome,
              i.nome AS instrutor_nome,
              t.local, t.sala_online, t.data_inicio, t.data_fim,
              t.status AS turma_status
       FROM avaliacoes av
       JOIN alunos a ON a.id = av.aluno_id
       LEFT JOIN empresas e ON e.id = a.empresa_id
       JOIN cursos c ON c.id = av.curso_id
       JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
       JOIN instrutores i ON i.id = av.instrutor_id
       JOIN turmas t ON t.id = av.turma_id
       WHERE av.id = ?`,
      req.params.id
    );

    if (!evaluation) {
      return res.status(404).json({ message: 'Avaliação não encontrada.' });
    }

    res.json(evaluation);
  })
);
