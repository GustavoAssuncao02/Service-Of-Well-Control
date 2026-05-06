import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const classRoutes = Router();

classRoutes.use(authenticate, requireAdmin);

async function syncClassStudents(db, turmaId, studentIds = []) {
  const uniqueStudentIds = [...new Set(studentIds.map(Number).filter(Boolean))];

  if (!uniqueStudentIds.length) {
    await db.run('DELETE FROM turma_alunos WHERE turma_id = ?', turmaId);
    return;
  }

  const placeholders = uniqueStudentIds.map(() => '?').join(', ');
  await db.run(`DELETE FROM turma_alunos WHERE turma_id = ? AND aluno_id NOT IN (${placeholders})`, turmaId, ...uniqueStudentIds);

  for (const studentId of uniqueStudentIds) {
    await db.run('INSERT IGNORE INTO turma_alunos (turma_id, aluno_id) VALUES (?, ?)', turmaId, studentId);
  }
}

function buildClassReportFilters(query) {
  const where = [];
  const whereParams = [];
  const having = [];
  const havingParams = [];

  const search = String(query.search || '').trim();
  if (search) {
    const term = `%${search}%`;
    where.push(
      `(CAST(t.id AS CHAR) LIKE ?
        OR c.nome LIKE ?
        OR cc.nome LIKE ?
        OR i.nome LIKE ?
        OR COALESCE(t.local, '') LIKE ?
        OR COALESCE(t.sala_online, '') LIKE ?
        OR COALESCE(t.observacao, '') LIKE ?
        OR t.status LIKE ?)`
    );
    whereParams.push(term, term, term, term, term, term, term, term);
  }

  if (query.startFrom) {
    where.push('DATE(t.data_inicio) >= DATE(?)');
    whereParams.push(query.startFrom);
  }

  if (query.startTo) {
    where.push('DATE(t.data_inicio) <= DATE(?)');
    whereParams.push(query.startTo);
  }

  if (query.endFrom) {
    where.push('DATE(t.data_fim) >= DATE(?)');
    whereParams.push(query.endFrom);
  }

  if (query.endTo) {
    where.push('DATE(t.data_fim) <= DATE(?)');
    whereParams.push(query.endTo);
  }

  if (query.createdFrom) {
    where.push('DATE(t.criado_em) >= DATE(?)');
    whereParams.push(query.createdFrom);
  }

  if (query.createdTo) {
    where.push('DATE(t.criado_em) <= DATE(?)');
    whereParams.push(query.createdTo);
  }

  if (query.courseId) {
    where.push('t.curso_id = ?');
    whereParams.push(query.courseId);
  }

  if (query.classificationId) {
    where.push('c.classificacao_id = ?');
    whereParams.push(query.classificationId);
  }

  if (query.instructorId) {
    where.push('t.instrutor_id = ?');
    whereParams.push(query.instructorId);
  }

  if (query.status) {
    where.push('t.status = ?');
    whereParams.push(query.status);
  }

  if (query.local) {
    where.push('TRIM(t.local) = ?');
    whereParams.push(String(query.local).trim());
  }

  if (query.onlineRoom) {
    where.push('TRIM(t.sala_online) = ?');
    whereParams.push(String(query.onlineRoom).trim());
  }

  if (query.hasStudents === 'yes') {
    having.push('total_alunos > 0');
  } else if (query.hasStudents === 'no') {
    having.push('total_alunos = 0');
  }

  if (query.minStudents) {
    having.push('total_alunos >= ?');
    havingParams.push(Number(query.minStudents));
  }

  if (query.maxStudents) {
    having.push('total_alunos <= ?');
    havingParams.push(Number(query.maxStudents));
  }

  if (query.hasEvaluations === 'yes') {
    having.push('avaliacoes_recebidas > 0');
  } else if (query.hasEvaluations === 'no') {
    having.push('avaliacoes_recebidas = 0');
  }

  if (query.minResponseRate) {
    having.push('taxa_resposta >= ?');
    havingParams.push(Number(query.minResponseRate));
  }

  if (query.maxResponseRate) {
    having.push('taxa_resposta <= ?');
    havingParams.push(Number(query.maxResponseRate));
  }

  if (query.minAverage) {
    having.push('media_geral >= ?');
    havingParams.push(Number(query.minAverage));
  }

  if (query.maxAverage) {
    having.push('media_geral <= ?');
    havingParams.push(Number(query.maxAverage));
  }

  return {
    where: where.length ? `WHERE ${where.join(' AND ')}` : '',
    having: having.length ? `HAVING ${having.join(' AND ')}` : '',
    params: [...whereParams, ...havingParams]
  };
}

classRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const filters = [];
    const params = [];

    if (req.query.status) {
      filters.push('t.status = ?');
      params.push(req.query.status);
    }

    if (req.query.courseId) {
      filters.push('t.curso_id = ?');
      params.push(req.query.courseId);
    }

    if (req.query.instructorId) {
      filters.push('t.instrutor_id = ?');
      params.push(req.query.instructorId);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const classes = await db.all(
      `SELECT t.*, c.nome AS curso_nome, i.nome AS instrutor_nome,
              COUNT(ta.id) AS total_alunos,
              SUM(CASE WHEN ta.status = 'Concluído' THEN 1 ELSE 0 END) AS alunos_concluidos
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       LEFT JOIN turma_alunos ta ON ta.turma_id = t.id
       ${where}
       GROUP BY t.id
       ORDER BY DATE(t.data_inicio) DESC`,
      params
    );

    res.json(classes);
  })
);

classRoutes.get(
  '/report-options',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const [statusRows, locationRows, onlineRoomRows] = await Promise.all([
      db.all(
        `SELECT DISTINCT TRIM(status) AS value
         FROM turmas
         WHERE status IS NOT NULL AND TRIM(status) <> ''
         ORDER BY value ASC`
      ),
      db.all(
        `SELECT DISTINCT TRIM(local) AS value
         FROM turmas
         WHERE local IS NOT NULL AND TRIM(local) <> ''
         ORDER BY value ASC`
      ),
      db.all(
        `SELECT DISTINCT TRIM(sala_online) AS value
         FROM turmas
         WHERE sala_online IS NOT NULL AND TRIM(sala_online) <> ''
         ORDER BY value ASC`
      )
    ]);

    res.json({
      statuses: statusRows.map((row) => row.value),
      locations: locationRows.map((row) => row.value),
      onlineRooms: onlineRoomRows.map((row) => row.value)
    });
  })
);

classRoutes.get(
  '/report',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { where, having, params } = buildClassReportFilters(req.query);
    const classes = await db.all(
      `SELECT t.id,
              t.curso_id,
              c.nome AS curso_nome,
              c.classificacao_id,
              cc.nome AS classificacao_nome,
              t.instrutor_id,
              i.nome AS instrutor_nome,
              t.data_inicio,
              t.data_fim,
              t.local,
              t.sala_online,
              t.observacao,
              t.status,
              DATE(t.criado_em) AS data_cadastro,
              DATE(t.atualizado_em) AS data_atualizacao,
              COALESCE(COUNT(DISTINCT ta.aluno_id), 0) AS total_alunos,
              COALESCE(SUM(CASE WHEN ta.status LIKE 'Conclu%' THEN 1 ELSE 0 END), 0) AS alunos_concluidos,
              COALESCE(SUM(CASE WHEN ta.id IS NOT NULL AND ta.status NOT LIKE 'Conclu%' THEN 1 ELSE 0 END), 0) AS alunos_em_andamento,
              COALESCE(COUNT(DISTINCT av.id), 0) AS avaliacoes_recebidas,
              GREATEST(
                COALESCE(SUM(CASE WHEN ta.status LIKE 'Conclu%' THEN 1 ELSE 0 END), 0) - COALESCE(COUNT(DISTINCT av.id), 0),
                0
              ) AS avaliacoes_pendentes,
              ROUND(
                CASE
                  WHEN COALESCE(SUM(CASE WHEN ta.status LIKE 'Conclu%' THEN 1 ELSE 0 END), 0) > 0
                    THEN COALESCE(COUNT(DISTINCT av.id), 0) * 100 / SUM(CASE WHEN ta.status LIKE 'Conclu%' THEN 1 ELSE 0 END)
                  ELSE 0
                END,
                1
              ) AS taxa_resposta,
              ROUND(AVG(av.nota_geral), 2) AS media_geral,
              MIN(av.nota_geral) AS menor_nota,
              MAX(av.nota_geral) AS maior_nota
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
       JOIN instrutores i ON i.id = t.instrutor_id
       LEFT JOIN turma_alunos ta ON ta.turma_id = t.id
       LEFT JOIN avaliacoes av ON av.turma_id = t.id AND av.aluno_id = ta.aluno_id
       ${where}
       GROUP BY t.id
       ${having}
       ORDER BY DATE(t.data_inicio) DESC, c.nome ASC`,
      params
    );

    res.json(classes);
  })
);

classRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const turma = await db.get(
      `SELECT t.*, c.nome AS curso_nome, c.descricao AS curso_descricao,
              cc.nome AS classificacao_nome,
              i.nome AS instrutor_nome
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       LEFT JOIN classificacoes_cursos cc ON cc.id = c.classificacao_id
       JOIN instrutores i ON i.id = t.instrutor_id
       WHERE t.id = ?`,
      req.params.id
    );

    if (!turma) {
      return res.status(404).json({ message: 'Turma não encontrada.' });
    }

    const alunos = await db.all(
      `SELECT a.*, ta.status AS status_turma, ta.matriculado_em, ta.concluido_em
       FROM turma_alunos ta
       JOIN alunos a ON a.id = ta.aluno_id
       WHERE ta.turma_id = ?
       ORDER BY a.criado_em DESC`,
      req.params.id
    );

    res.json({ ...turma, alunos });
  })
);

classRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { curso_id, data_inicio, data_fim, instrutor_id, local, sala_online, observacao, status = 'Em andamento', student_ids = [] } = req.body;
    const localName = String(local || '').trim();
    const onlineRoomName = String(sala_online || '').trim();

    if (!curso_id || !data_inicio || !data_fim || !instrutor_id || !localName || !onlineRoomName) {
      return res.status(400).json({ message: 'Curso, datas, instrutor, local físico e sala online são obrigatórios.' });
    }

    await db.exec('BEGIN');
    try {
      const result = await db.run(
        `INSERT INTO turmas (curso_id, data_inicio, data_fim, instrutor_id, local, sala_online, observacao, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        curso_id,
        data_inicio,
        data_fim,
        instrutor_id,
        localName,
        onlineRoomName,
        observacao || null,
        status
      );

      await syncClassStudents(db, result.lastID, student_ids);
      await db.exec('COMMIT');

      const turma = await db.get('SELECT * FROM turmas WHERE id = ?', result.lastID);
      res.status(201).json(turma);
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  })
);

classRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { curso_id, data_inicio, data_fim, instrutor_id, local, sala_online, observacao, status, student_ids } = req.body;
    const localName = String(local || '').trim();
    const onlineRoomName = String(sala_online || '').trim();

    if (!curso_id || !data_inicio || !data_fim || !instrutor_id || !localName || !onlineRoomName) {
      return res.status(400).json({ message: 'Curso, datas, instrutor, local físico e sala online são obrigatórios.' });
    }

    await db.exec('BEGIN');
    try {
      await db.run(
        `UPDATE turmas
         SET curso_id = ?, data_inicio = ?, data_fim = ?, instrutor_id = ?, local = ?, sala_online = ?, observacao = ?, status = ?, atualizado_em = CURRENT_TIMESTAMP
         WHERE id = ?`,
        curso_id,
        data_inicio,
        data_fim,
        instrutor_id,
        localName,
        onlineRoomName,
        observacao || null,
        status,
        req.params.id
      );

      if (Array.isArray(student_ids)) {
        await syncClassStudents(db, req.params.id, student_ids);
      }

      await db.exec('COMMIT');
      const turma = await db.get('SELECT * FROM turmas WHERE id = ?', req.params.id);
      res.json(turma);
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  })
);

classRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.run('DELETE FROM turmas WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);

classRoutes.patch(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.exec('BEGIN');
    try {
      await db.run("UPDATE turmas SET status = 'Concluído', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?", req.params.id);
      await db.run(
        "UPDATE turma_alunos SET status = 'Concluído', concluido_em = COALESCE(concluido_em, CURRENT_TIMESTAMP) WHERE turma_id = ?",
        req.params.id
      );
      await db.exec('COMMIT');
      res.json({ message: 'Turma concluída.' });
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  })
);

classRoutes.patch(
  '/:id/reopen',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.exec('BEGIN');
    try {
      await db.run("UPDATE turmas SET status = 'Em andamento', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?", req.params.id);
      await db.run(
        "UPDATE turma_alunos SET status = 'Em andamento', concluido_em = NULL WHERE turma_id = ?",
        req.params.id
      );
      await db.exec('COMMIT');
      res.json({ message: 'Turma reaberta.' });
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  })
);

classRoutes.patch(
  '/:id/students/:studentId/complete',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.run(
      "UPDATE turma_alunos SET status = 'Concluído', concluido_em = COALESCE(concluido_em, CURRENT_TIMESTAMP) WHERE turma_id = ? AND aluno_id = ?",
      req.params.id,
      req.params.studentId
    );
    res.json({ message: 'Aluno concluído na turma.' });
  })
);

classRoutes.patch(
  '/:id/students/:studentId/reopen',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.run(
      "UPDATE turma_alunos SET status = 'Em andamento', concluido_em = NULL WHERE turma_id = ? AND aluno_id = ?",
      req.params.id,
      req.params.studentId
    );
    await db.run("UPDATE turmas SET status = 'Em andamento', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?", req.params.id);
    res.json({ message: 'Aluno reaberto na turma.' });
  })
);

classRoutes.get(
  '/:id/evaluation-status',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const filter = req.query.filter;
    const rows = await db.all(
      `SELECT a.id AS aluno_id, a.nome_completo, a.cpf,
              ta.status AS status_turma,
              av.id AS avaliacao_id,
              CASE
                WHEN ta.status <> 'Concluído' THEN 'Aluno não concluído'
                WHEN av.id IS NULL THEN 'Não respondeu'
                ELSE 'Respondeu'
              END AS status
       FROM turma_alunos ta
       JOIN alunos a ON a.id = ta.aluno_id
       LEFT JOIN avaliacoes av ON av.turma_id = ta.turma_id AND av.aluno_id = ta.aluno_id
       WHERE ta.turma_id = ?
       ORDER BY a.nome_completo ASC`,
      req.params.id
    );

    const filtered = rows.filter((row) => {
      if (filter === 'responded') return row.avaliacao_id;
      if (filter === 'pending') return row.status_turma === 'Concluído' && !row.avaliacao_id;
      return true;
    });

    res.json(filtered);
  })
);
