import { Router } from 'express';
import { getDb } from '../database/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { onlyDigits } from '../utils/format.js';

export const publicRoutes = Router();

publicRoutes.get(
  '/companies',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const companies = await db.all(
      `SELECT id, nome
       FROM empresas
       ORDER BY nome ASC`
    );

    res.json(companies);
  })
);

publicRoutes.get(
  '/classes',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const rows = await db.all(
      `SELECT t.id, t.data_inicio, t.data_fim, t.local, t.sala_online, t.status,
              c.id AS curso_id, c.nome AS curso_nome,
              i.id AS instrutor_id, i.nome AS instrutor_nome
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       WHERE t.status = 'Concluído'
          OR EXISTS (
            SELECT 1
            FROM turma_alunos ta
            WHERE ta.turma_id = t.id
              AND ta.status = 'Concluído'
          )
       ORDER BY DATE(t.data_fim) DESC`
    );

    res.json(rows);
  })
);

publicRoutes.get(
  '/classes/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const turma = await db.get(
      `SELECT t.id, t.data_inicio, t.data_fim, t.local, t.sala_online, t.status,
              c.id AS curso_id, c.nome AS curso_nome,
              i.id AS instrutor_id, i.nome AS instrutor_nome
       FROM turmas t
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       WHERE t.id = ?`,
      req.params.id
    );

    if (!turma) {
      return res.status(404).json({ message: 'Turma não encontrada.' });
    }

    res.json(turma);
  })
);

publicRoutes.post(
  '/evaluations/validate',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const cpf = onlyDigits(req.body.cpf);
    const turmaId = req.body.turma_id;

    if (!cpf || !turmaId) {
      return res.status(400).json({ message: 'Informe CPF e turma.' });
    }

    const enrollment = await db.get(
      `SELECT a.id AS aluno_id, a.nome_completo, a.cpf,
              t.id AS turma_id, t.data_inicio, t.data_fim, t.local, t.sala_online, t.status,
              ta.status AS status_matricula,
              c.id AS curso_id, c.nome AS curso_nome,
              i.id AS instrutor_id, i.nome AS instrutor_nome,
              av.id AS avaliacao_id
       FROM turma_alunos ta
       JOIN alunos a ON a.id = ta.aluno_id
       JOIN turmas t ON t.id = ta.turma_id
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       LEFT JOIN avaliacoes av ON av.turma_id = t.id AND av.aluno_id = a.id
       WHERE a.cpf = ? AND t.id = ?`,
      cpf,
      turmaId
    );

    if (!enrollment) {
      return res.status(404).json({ message: 'CPF não localizado nessa turma.' });
    }

    if (enrollment.status_matricula !== 'Concluído') {
      return res.status(400).json({ message: 'A avaliação fica disponível somente após a conclusão do aluno nesta turma.' });
    }

    res.json({
      aluno: {
        id: enrollment.aluno_id,
        nome_completo: enrollment.nome_completo,
        cpf: enrollment.cpf
      },
      turma: {
        id: enrollment.turma_id,
        data_inicio: enrollment.data_inicio,
        data_fim: enrollment.data_fim,
        local: enrollment.local,
        sala_online: enrollment.sala_online,
        status: enrollment.status,
        status_matricula: enrollment.status_matricula
      },
      curso: {
        id: enrollment.curso_id,
        nome: enrollment.curso_nome
      },
      instrutor: {
        id: enrollment.instrutor_id,
        nome: enrollment.instrutor_nome
      },
      alreadyAnswered: Boolean(enrollment.avaliacao_id)
    });
  })
);

publicRoutes.post(
  '/evaluations',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { aluno_id, turma_id, data_avaliacao, notas, nota_geral, teste_zoom, comentario } = req.body;

    if (!aluno_id || !turma_id || !data_avaliacao || !Array.isArray(notas) || notas.length !== 14 || nota_geral === undefined || nota_geral === null || nota_geral === '' || !teste_zoom) {
      return res.status(400).json({ message: 'Dados de avaliação incompletos.' });
    }

    const overallScore = Number(nota_geral);
    const invalidScore = notas.some((nota) => Number.isNaN(Number(nota)) || Number(nota) < 1 || Number(nota) > 5);
    if (invalidScore || Number.isNaN(overallScore) || overallScore < 0 || overallScore > 10 || !['Sim', 'Não'].includes(teste_zoom)) {
      return res.status(400).json({ message: 'Notas fora do intervalo permitido.' });
    }

    const membership = await db.get(
      `SELECT t.*, ta.aluno_id, ta.status AS status_matricula
       FROM turma_alunos ta
       JOIN turmas t ON t.id = ta.turma_id
       WHERE ta.aluno_id = ? AND ta.turma_id = ?`,
      aluno_id,
      turma_id
    );

    if (!membership) {
      return res.status(404).json({ message: 'Aluno não pertence à turma informada.' });
    }

    if (membership.status_matricula !== 'Concluído') {
      return res.status(400).json({ message: 'Somente alunos concluídos nesta turma podem avaliar.' });
    }

    const placeholders = Array.from({ length: 14 }, (_, index) => `nota_${index + 1}`).join(', ');
    const questionMarks = Array.from({ length: 14 }, () => '?').join(', ');
    const result = await db.run(
      `INSERT INTO avaliacoes (
        aluno_id, turma_id, curso_id, instrutor_id, data_avaliacao, ${placeholders},
        nota_geral, teste_zoom, comentario
      ) VALUES (?, ?, ?, ?, ?, ${questionMarks}, ?, ?, ?)`,
      aluno_id,
      turma_id,
      membership.curso_id,
      membership.instrutor_id,
      data_avaliacao,
      ...notas.map(Number),
      overallScore,
      teste_zoom,
      comentario || null
    );

    const evaluation = await db.get('SELECT * FROM avaliacoes WHERE id = ?', result.lastID);
    res.status(201).json(evaluation);
  })
);
