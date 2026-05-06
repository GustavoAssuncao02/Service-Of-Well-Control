import { Router } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { deleteDriveFile, uploadStudentDocumentToDrive } from '../services/googleDrive.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { firstName, onlyDigits } from '../utils/format.js';

export const studentRoutes = Router();

studentRoutes.use(authenticate, requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, env.googleDriveMaxUploadMb) * 1024 * 1024
  }
});
const uploadStudentDocuments = upload.fields([
  { name: 'arquivo', maxCount: 1 },
  { name: 'arquivos', maxCount: 20 }
]);

const editableStudentFields = [
  'nome_completo',
  'data_nascimento',
  'telefone',
  'email',
  'sexo',
  'sexo_outro',
  'cep',
  'rua',
  'bairro',
  'numero',
  'cidade',
  'estado',
  'responsavel_inscricao',
  'empresa_id',
  'empresa',
  'sonda_unidade',
  'operacao',
  'funcao',
  'funcao_outro',
  'observacao'
];

async function prepareStudentPayload(db, currentStudent, payload) {
  if (payload.cpf && onlyDigits(payload.cpf) !== currentStudent.cpf) {
    const error = new Error('CPF não pode ser alterado.');
    error.status = 400;
    throw error;
  }

  const missing = [
    'nome_completo',
    'data_nascimento',
    'telefone',
    'email',
    'sexo',
    'cep',
    'rua',
    'bairro',
    'numero',
    'cidade',
    'estado',
    'responsavel_inscricao',
    'sonda_unidade',
    'operacao',
    'funcao'
  ].filter((field) => !payload[field]);

  if (missing.length) {
    const error = new Error(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (payload.sexo === 'Outro' && !payload.sexo_outro) {
    const error = new Error('Informe o sexo quando selecionar Outro.');
    error.status = 400;
    throw error;
  }

  const preparedPayload = { ...payload };
  if (payload.responsavel_inscricao === 'Empresa') {
    if (!payload.empresa_id) {
      const error = new Error('Selecione a empresa responsável pela inscrição.');
      error.status = 400;
      throw error;
    }

    const company = await db.get('SELECT id, nome FROM empresas WHERE id = ?', payload.empresa_id);
    if (!company) {
      const error = new Error('Empresa não encontrada.');
      error.status = 404;
      throw error;
    }

    preparedPayload.empresa_id = company.id;
    preparedPayload.empresa = company.nome;
  } else {
    preparedPayload.empresa_id = null;
    preparedPayload.empresa = null;
  }

  if (preparedPayload.funcao === 'Outro' && !preparedPayload.funcao_outro) {
    const error = new Error('Informe a função quando selecionar Outro.');
    error.status = 400;
    throw error;
  }

  if (preparedPayload.sexo !== 'Outro') {
    preparedPayload.sexo_outro = null;
  }

  if (preparedPayload.funcao !== 'Outro') {
    preparedPayload.funcao_outro = null;
  }

  return preparedPayload;
}

function monthNumberFromQuery(value) {
  const rawValue = String(value || '');
  const monthFromIso = rawValue.match(/^\d{4}-(\d{2})$/);

  if (monthFromIso) {
    return Number(monthFromIso[1]);
  }

  const numericMonth = Number(rawValue || new Date().getMonth() + 1);
  if (numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }

  return new Date().getMonth() + 1;
}

function renderBirthdayMessage(template, student) {
  return String(template || '')
    .replaceAll('{nome}', student.nome_completo || '')
    .replaceAll('{primeiro_nome}', firstName(student.nome_completo))
    .replaceAll('{email}', student.email || '')
    .replaceAll('{telefone}', student.telefone || '');
}

function normalizeOptionalClassId(value) {
  if (value === undefined || value === null || value === '') return null;

  const classId = Number(value);
  if (!Number.isInteger(classId) || classId <= 0) {
    const error = new Error('Turma selecionada invalida.');
    error.status = 400;
    throw error;
  }

  return classId;
}

function classFolderName(turma) {
  const startDate = String(turma.data_inicio || '').slice(0, 10);
  const endDate = String(turma.data_fim || '').slice(0, 10);
  const dateRange = startDate && endDate ? ` - ${startDate} a ${endDate}` : '';
  return `Turma ${turma.id} - ${turma.curso_nome || 'Curso'}${dateRange}`;
}

async function getStudentClassForDocument(db, studentId, classId) {
  if (!classId) return null;

  const turma = await db.get(
    `SELECT t.id, t.data_inicio, t.data_fim, c.nome AS curso_nome, i.nome AS instrutor_nome
     FROM turma_alunos ta
     JOIN turmas t ON t.id = ta.turma_id
     JOIN cursos c ON c.id = t.curso_id
     JOIN instrutores i ON i.id = t.instrutor_id
     WHERE ta.aluno_id = ?
       AND ta.turma_id = ?`,
    studentId,
    classId
  );

  if (!turma) {
    const error = new Error('A turma selecionada nao esta vinculada a este aluno.');
    error.status = 400;
    throw error;
  }

  return turma;
}

function studentDocumentsQuery(whereClause) {
  return `SELECT ad.*,
                 t.data_inicio AS turma_data_inicio,
                 t.data_fim AS turma_data_fim,
                 c.nome AS turma_curso_nome,
                 i.nome AS turma_instrutor_nome
          FROM aluno_documentos ad
          LEFT JOIN turmas t ON t.id = ad.turma_id
          LEFT JOIN cursos c ON c.id = t.curso_id
          LEFT JOIN instrutores i ON i.id = t.instrutor_id
          ${whereClause}`;
}

function monthName(monthNumber) {
  const names = [
    'Janeiro',
    'Fevereiro',
    'Marco',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ];

  return names[Number(monthNumber) - 1] || '';
}

function buildStudentReportWhere(query) {
  const where = [];
  const params = [];

  const search = String(query.search || '').trim();
  if (search) {
    const term = `%${search}%`;
    const digits = onlyDigits(search);
    const searchWhere = [
      'a.nome_completo LIKE ?',
      'a.cpf LIKE ?',
      'a.email LIKE ?',
      'a.telefone LIKE ?'
    ];

    params.push(term, term, term, term);

    if (digits) {
      const digitTerm = `%${digits}%`;
      searchWhere.push("REPLACE(REPLACE(REPLACE(a.cpf, '.', ''), '-', ''), ' ', '') LIKE ?");
      searchWhere.push("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(a.telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') LIKE ?");
      params.push(digitTerm, digitTerm);
    }

    where.push(`(${searchWhere.join(' OR ')})`);
  }

  if (query.createdFrom) {
    where.push('DATE(a.criado_em) >= DATE(?)');
    params.push(query.createdFrom);
  }

  if (query.createdTo) {
    where.push('DATE(a.criado_em) <= DATE(?)');
    params.push(query.createdTo);
  }

  if (query.birthFrom) {
    where.push('DATE(a.data_nascimento) >= DATE(?)');
    params.push(query.birthFrom);
  }

  if (query.birthTo) {
    where.push('DATE(a.data_nascimento) <= DATE(?)');
    params.push(query.birthTo);
  }

  if (query.responsavel) {
    where.push('a.responsavel_inscricao = ?');
    params.push(query.responsavel);
  }

  if (query.companyId) {
    where.push('a.empresa_id = ?');
    params.push(query.companyId);
  }

  if (query.sexo) {
    where.push('a.sexo = ?');
    params.push(query.sexo);
  }

  if (query.operacao) {
    where.push('a.operacao = ?');
    params.push(query.operacao);
  }

  if (query.funcao) {
    where.push('(a.funcao = ? OR a.funcao_outro LIKE ?)');
    params.push(query.funcao, `%${String(query.funcao).trim()}%`);
  }

  if (query.cidade) {
    where.push('TRIM(a.cidade) = ?');
    params.push(String(query.cidade).trim());
  }

  if (query.estado) {
    where.push('TRIM(a.estado) = ?');
    params.push(String(query.estado).trim());
  }

  if (query.courseId) {
    where.push(
      `EXISTS (
        SELECT 1
        FROM turma_alunos ta_filter
        JOIN turmas t_filter ON t_filter.id = ta_filter.turma_id
        WHERE ta_filter.aluno_id = a.id
          AND t_filter.curso_id = ?
      )`
    );
    params.push(query.courseId);
  }

  if (query.classStatus) {
    where.push(
      `EXISTS (
        SELECT 1
        FROM turma_alunos ta_status
        WHERE ta_status.aluno_id = a.id
          AND ta_status.status = ?
      )`
    );
    params.push(query.classStatus);
  }

  if (query.hasClasses === 'yes') {
    where.push('COALESCE(class_stats.total_turmas, 0) > 0');
  } else if (query.hasClasses === 'no') {
    where.push('COALESCE(class_stats.total_turmas, 0) = 0');
  }

  if (query.minClasses) {
    where.push('COALESCE(class_stats.total_turmas, 0) >= ?');
    params.push(Number(query.minClasses));
  }

  if (query.maxClasses) {
    where.push('COALESCE(class_stats.total_turmas, 0) <= ?');
    params.push(Number(query.maxClasses));
  }

  if (query.hasDocuments === 'yes') {
    where.push('COALESCE(doc_stats.total_documentos, 0) > 0');
  } else if (query.hasDocuments === 'no') {
    where.push('COALESCE(doc_stats.total_documentos, 0) = 0');
  }

  if (query.hasNote === 'yes') {
    where.push("a.observacao IS NOT NULL AND TRIM(a.observacao) <> ''");
  } else if (query.hasNote === 'no') {
    where.push("(a.observacao IS NULL OR TRIM(a.observacao) = '')");
  }

  return {
    where: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

studentRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const students = await db.all(
      `SELECT a.*, e.nome AS empresa_nome,
              COALESCE(tc.total_turmas, 0) AS total_turmas
       FROM alunos a
       LEFT JOIN empresas e ON e.id = a.empresa_id
       LEFT JOIN (
         SELECT aluno_id, COUNT(*) AS total_turmas
         FROM turma_alunos
         GROUP BY aluno_id
       ) tc ON tc.aluno_id = a.id
       ORDER BY a.criado_em DESC`
    );

    res.json(students);
  })
);

studentRoutes.get(
  '/birthday-messages',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const messages = await db.all(
      `SELECT *
       FROM mensagens_aniversario
       ORDER BY criado_em ASC, titulo ASC`
    );

    res.json(messages);
  })
);

studentRoutes.post(
  '/birthday-messages',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const titulo = String(req.body.titulo || '').trim();
    const conteudo = String(req.body.conteudo || '').trim();

    if (!titulo || !conteudo) {
      return res.status(400).json({ message: 'Título e mensagem são obrigatórios.' });
    }

    const result = await db.run('INSERT INTO mensagens_aniversario (titulo, conteudo) VALUES (?, ?)', titulo, conteudo);
    const message = await db.get('SELECT * FROM mensagens_aniversario WHERE id = ?', result.lastID);
    res.status(201).json(message);
  })
);

studentRoutes.put(
  '/birthday-messages/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const titulo = String(req.body.titulo || '').trim();
    const conteudo = String(req.body.conteudo || '').trim();

    if (!titulo || !conteudo) {
      return res.status(400).json({ message: 'Título e mensagem são obrigatórios.' });
    }

    const existingMessage = await db.get('SELECT * FROM mensagens_aniversario WHERE id = ?', req.params.id);
    if (!existingMessage) {
      return res.status(404).json({ message: 'Mensagem padrão não encontrada.' });
    }

    await db.run(
      'UPDATE mensagens_aniversario SET titulo = ?, conteudo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
      titulo,
      conteudo,
      req.params.id
    );

    const message = await db.get('SELECT * FROM mensagens_aniversario WHERE id = ?', req.params.id);
    res.json(message);
  })
);

studentRoutes.delete(
  '/birthday-messages/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const existingMessage = await db.get('SELECT * FROM mensagens_aniversario WHERE id = ?', req.params.id);

    if (!existingMessage) {
      return res.status(404).json({ message: 'Mensagem padrão não encontrada.' });
    }

    await db.run('DELETE FROM mensagens_aniversario WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);

studentRoutes.get(
  '/birthdays',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const month = monthNumberFromQuery(req.query.month);
    const selectedMessage = req.query.messageId
      ? await db.get('SELECT * FROM mensagens_aniversario WHERE id = ?', req.query.messageId)
      : await db.get('SELECT * FROM mensagens_aniversario ORDER BY criado_em ASC, titulo ASC LIMIT 1');
    const students = await db.all(
      `SELECT id, nome_completo, cpf, telefone, email, data_nascimento,
              DAY(data_nascimento) AS dia
       FROM alunos
       WHERE MONTH(data_nascimento) = ?
       ORDER BY dia ASC, nome_completo ASC`,
      Number(month)
    );

    res.json(
      students.map((student) => ({
        ...student,
        mensagem: renderBirthdayMessage(selectedMessage?.conteudo || '', student)
      }))
    );
  })
);

studentRoutes.get(
  '/report-options',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const [cityRows, stateRows] = await Promise.all([
      db.all(
        `SELECT DISTINCT TRIM(cidade) AS value
         FROM alunos
         WHERE cidade IS NOT NULL AND TRIM(cidade) <> ''
         ORDER BY value ASC`
      ),
      db.all(
        `SELECT DISTINCT TRIM(estado) AS value
         FROM alunos
         WHERE estado IS NOT NULL AND TRIM(estado) <> ''
         ORDER BY value ASC`
      )
    ]);

    res.json({
      cities: cityRows.map((row) => row.value),
      states: stateRows.map((row) => row.value)
    });
  })
);

studentRoutes.get(
  '/report',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { where, params } = buildStudentReportWhere(req.query);
    const students = await db.all(
      `SELECT a.id,
              a.nome_completo,
              a.data_nascimento,
              a.telefone,
              a.cpf,
              a.email,
              a.sexo,
              a.sexo_outro,
              CASE WHEN a.sexo = 'Outro' THEN a.sexo_outro ELSE a.sexo END AS sexo_descricao,
              a.cep,
              a.rua,
              a.bairro,
              a.numero,
              a.cidade,
              a.estado,
              CONCAT_WS(', ', a.rua, a.numero, a.bairro, a.cidade, a.estado) AS endereco_completo,
              a.responsavel_inscricao,
              a.empresa_id,
              COALESCE(e.nome, a.empresa) AS empresa,
              a.sonda_unidade,
              a.operacao,
              a.funcao,
              a.funcao_outro,
              CASE WHEN a.funcao = 'Outro' THEN a.funcao_outro ELSE a.funcao END AS funcao_descricao,
              a.observacao,
              DATE(a.criado_em) AS data_cadastro,
              DATE(a.atualizado_em) AS data_atualizacao,
              COALESCE(class_stats.total_turmas, 0) AS total_turmas,
              COALESCE(class_stats.turmas_concluidas, 0) AS turmas_concluidas,
              COALESCE(class_stats.turmas_em_andamento, 0) AS turmas_em_andamento,
              class_stats.primeira_turma,
              class_stats.ultima_turma,
              class_stats.cursos,
              COALESCE(doc_stats.total_documentos, 0) AS total_documentos
       FROM alunos a
       LEFT JOIN empresas e ON e.id = a.empresa_id
       LEFT JOIN (
         SELECT ta.aluno_id,
                COUNT(DISTINCT ta.turma_id) AS total_turmas,
                SUM(CASE WHEN ta.status = 'ConcluÃ­do' THEN 1 ELSE 0 END) AS turmas_concluidas,
                SUM(CASE WHEN ta.status = 'Em andamento' THEN 1 ELSE 0 END) AS turmas_em_andamento,
                MIN(t.data_inicio) AS primeira_turma,
                MAX(t.data_fim) AS ultima_turma,
                GROUP_CONCAT(DISTINCT c.nome ORDER BY c.nome SEPARATOR ', ') AS cursos
         FROM turma_alunos ta
         JOIN turmas t ON t.id = ta.turma_id
         JOIN cursos c ON c.id = t.curso_id
         GROUP BY ta.aluno_id
       ) class_stats ON class_stats.aluno_id = a.id
       LEFT JOIN (
         SELECT aluno_id, COUNT(*) AS total_documentos
         FROM aluno_documentos
         GROUP BY aluno_id
       ) doc_stats ON doc_stats.aluno_id = a.id
       ${where}
       ORDER BY a.nome_completo ASC`,
      params
    );

    res.json(students);
  })
);

studentRoutes.get(
  '/document-browser',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const selectedYear = req.query.year ? Number(req.query.year) : null;
    const selectedMonth = req.query.month ? Number(req.query.month) : null;
    const selectedClassId = req.query.classId ? Number(req.query.classId) : null;
    const selectedStudentId = req.query.studentId ? Number(req.query.studentId) : null;

    if (selectedYear && (!Number.isInteger(selectedYear) || selectedYear < 2000 || selectedYear > 2100)) {
      return res.status(400).json({ message: 'Ano invalido.' });
    }

    if (selectedMonth && (!Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12)) {
      return res.status(400).json({ message: 'Mes invalido.' });
    }

    if (selectedClassId && (!Number.isInteger(selectedClassId) || selectedClassId <= 0)) {
      return res.status(400).json({ message: 'Turma invalida.' });
    }

    if (selectedStudentId && (!Number.isInteger(selectedStudentId) || selectedStudentId <= 0)) {
      return res.status(400).json({ message: 'Aluno invalido.' });
    }

    const years = await db.all(
      `SELECT YEAR(t.data_inicio) AS ano,
              COUNT(DISTINCT t.id) AS total_turmas,
              COUNT(DISTINCT ad.id) AS total_documentos
       FROM turmas t
       LEFT JOIN aluno_documentos ad ON ad.turma_id = t.id
       GROUP BY YEAR(t.data_inicio)
       ORDER BY ano DESC`
    );

    const months = selectedYear
      ? await db.all(
          `SELECT MONTH(t.data_inicio) AS mes,
                  COUNT(DISTINCT t.id) AS total_turmas,
                  COUNT(DISTINCT ad.id) AS total_documentos
           FROM turmas t
           LEFT JOIN aluno_documentos ad ON ad.turma_id = t.id
           WHERE YEAR(t.data_inicio) = ?
           GROUP BY MONTH(t.data_inicio)
           ORDER BY mes ASC`,
          selectedYear
        )
      : [];

    const classes =
      selectedYear && selectedMonth
        ? await db.all(
            `SELECT t.id, t.data_inicio, t.data_fim, t.local, t.sala_online, t.status,
                    c.nome AS curso_nome,
                    i.nome AS instrutor_nome,
                    COUNT(DISTINCT ta.aluno_id) AS total_alunos,
                    COUNT(DISTINCT ad.id) AS total_documentos
             FROM turmas t
             JOIN cursos c ON c.id = t.curso_id
             JOIN instrutores i ON i.id = t.instrutor_id
             LEFT JOIN turma_alunos ta ON ta.turma_id = t.id
             LEFT JOIN aluno_documentos ad ON ad.turma_id = t.id
             WHERE YEAR(t.data_inicio) = ?
               AND MONTH(t.data_inicio) = ?
             GROUP BY t.id
             ORDER BY DATE(t.data_inicio) ASC, c.nome ASC`,
            selectedYear,
            selectedMonth
          )
        : [];

    let students = [];
    let documents = [];
    let selectedClass = null;
    let selectedStudent = null;

    if (selectedClassId) {
      selectedClass = await db.get(
        `SELECT t.id, t.data_inicio, t.data_fim, t.local, t.sala_online, t.status,
                c.nome AS curso_nome,
                i.nome AS instrutor_nome
         FROM turmas t
         JOIN cursos c ON c.id = t.curso_id
         JOIN instrutores i ON i.id = t.instrutor_id
         WHERE t.id = ?`,
        selectedClassId
      );

      if (!selectedClass) {
        return res.status(404).json({ message: 'Turma nao encontrada.' });
      }

      students = await db.all(
        `SELECT a.id, a.nome_completo, a.cpf, a.email, a.telefone,
                ta.status AS status_turma,
                COUNT(DISTINCT all_docs.id) AS total_documentos,
                COUNT(DISTINCT class_docs.id) AS total_documentos_turma
         FROM turma_alunos ta
         JOIN alunos a ON a.id = ta.aluno_id
         LEFT JOIN aluno_documentos all_docs ON all_docs.aluno_id = a.id
         LEFT JOIN aluno_documentos class_docs
           ON class_docs.aluno_id = a.id
          AND class_docs.turma_id = ta.turma_id
         WHERE ta.turma_id = ?
         GROUP BY a.id, ta.status
         ORDER BY a.nome_completo ASC`,
        selectedClassId
      );
    }

    if (selectedClassId && selectedStudentId) {
      selectedStudent = await db.get(
        `SELECT a.id, a.nome_completo, a.cpf, a.email, a.telefone
         FROM turma_alunos ta
         JOIN alunos a ON a.id = ta.aluno_id
         WHERE ta.turma_id = ?
           AND ta.aluno_id = ?`,
        selectedClassId,
        selectedStudentId
      );

      if (!selectedStudent) {
        return res.status(404).json({ message: 'Aluno nao encontrado nesta turma.' });
      }

      documents = await db.all(
        `${studentDocumentsQuery('WHERE ad.aluno_id = ? AND ad.turma_id = ?')}
         ORDER BY ad.criado_em DESC, ad.id DESC`,
        selectedStudentId,
        selectedClassId
      );
    }

    res.json({
      selection: {
        year: selectedYear,
        month: selectedMonth,
        classId: selectedClassId,
        studentId: selectedStudentId
      },
      years: years.map((row) => ({
        year: Number(row.ano),
        total_turmas: Number(row.total_turmas || 0),
        total_documentos: Number(row.total_documentos || 0)
      })),
      months: months.map((row) => ({
        month: Number(row.mes),
        label: monthName(row.mes),
        total_turmas: Number(row.total_turmas || 0),
        total_documentos: Number(row.total_documentos || 0)
      })),
      classes,
      students,
      documents,
      selectedClass,
      selectedStudent
    });
  })
);

studentRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const student = await db.get(
      `SELECT a.*, e.nome AS empresa_nome
       FROM alunos a
       LEFT JOIN empresas e ON e.id = a.empresa_id
       WHERE a.id = ?`,
      req.params.id
    );

    if (!student) {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }

    const classes = await db.all(
      `SELECT t.id, t.data_inicio, t.data_fim, t.local, t.sala_online, t.status AS turma_status,
              c.nome AS curso_nome, i.nome AS instrutor_nome,
              ta.status AS status_turma, ta.matriculado_em, ta.concluido_em
       FROM turma_alunos ta
       JOIN turmas t ON t.id = ta.turma_id
       JOIN cursos c ON c.id = t.curso_id
       JOIN instrutores i ON i.id = t.instrutor_id
       WHERE ta.aluno_id = ?
       ORDER BY DATE(t.data_inicio) DESC`,
      req.params.id
    );

    const documents = await db.all(
      `${studentDocumentsQuery('WHERE ad.aluno_id = ?')}
       ORDER BY ad.criado_em DESC, ad.id DESC`,
      req.params.id
    );

    res.json({ ...student, turmas: classes, documentos: documents });
  })
);

studentRoutes.post(
  '/:id/documents',
  uploadStudentDocuments,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const student = await db.get('SELECT id, nome_completo FROM alunos WHERE id = ?', req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Aluno nao encontrado.' });
    }

    const files = [...(req.files?.arquivo || []), ...(req.files?.arquivos || [])];

    if (!files.length) {
      return res.status(400).json({ message: 'Selecione um ou mais arquivos para anexar.' });
    }

    const classId = normalizeOptionalClassId(req.body.turma_id);
    const selectedClass = await getStudentClassForDocument(db, student.id, classId);
    const uploadedFiles = [];
    const insertedIds = [];
    try {
      for (const file of files) {
        const driveFile = await uploadStudentDocumentToDrive({
          studentName: student.nome_completo,
          classFolderName: selectedClass ? classFolderName(selectedClass) : '',
          file
        });
        uploadedFiles.push({ file, driveFile });
      }

      await db.exec('START TRANSACTION');

      for (const item of uploadedFiles) {
        const result = await db.run(
          `INSERT INTO aluno_documentos (aluno_id, turma_id, nome_arquivo, tipo_arquivo, tamanho_bytes, drive_file_id, drive_folder_id, drive_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          req.params.id,
          selectedClass?.id || null,
          item.file.originalname,
          item.file.mimetype || 'Arquivo',
          item.file.size,
          item.driveFile.fileId,
          item.driveFile.folderId,
          item.driveFile.url
        );
        insertedIds.push(result.lastID);
      }

      await db.exec('COMMIT');
    } catch (error) {
      try {
        await db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error(rollbackError);
      }

      if (insertedIds.length) {
        const placeholders = insertedIds.map(() => '?').join(', ');
        try {
          await db.run(`DELETE FROM aluno_documentos WHERE id IN (${placeholders})`, insertedIds);
        } catch (cleanupError) {
          console.error(cleanupError);
        }
      }

      await Promise.allSettled(uploadedFiles.map((item) => deleteDriveFile(item.driveFile.fileId)));

      if (error?.response?.data?.error?.message) {
        error.message = `Google Drive: ${error.response.data.error.message}`;
      }

      throw error;
    }

    const placeholders = insertedIds.map(() => '?').join(', ');
    const documents = await db.all(
      `${studentDocumentsQuery(`WHERE ad.id IN (${placeholders})`)}
       ORDER BY ad.criado_em DESC, ad.id DESC`,
      insertedIds
    );
    res.status(201).json(documents);
  })
);

studentRoutes.delete(
  '/:id/documents/:documentId',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const document = await db.get('SELECT * FROM aluno_documentos WHERE id = ? AND aluno_id = ?', req.params.documentId, req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Documento nao encontrado.' });
    }

    await deleteDriveFile(document.drive_file_id);
    await db.run('DELETE FROM aluno_documentos WHERE id = ? AND aluno_id = ?', req.params.documentId, req.params.id);
    res.status(204).send();
  })
);

studentRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const student = await db.get('SELECT id FROM alunos WHERE id = ?', req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Aluno nao encontrado.' });
    }

    const usage = await db.get('SELECT COUNT(*) AS total FROM turma_alunos WHERE aluno_id = ?', req.params.id);
    if (usage.total > 0) {
      return res.status(409).json({ message: 'Este aluno esta vinculado a uma ou mais turmas e nao pode ser excluido.' });
    }

    await db.run('DELETE FROM alunos WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);

studentRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const currentStudent = await db.get('SELECT * FROM alunos WHERE id = ?', req.params.id);

    if (!currentStudent) {
      return res.status(404).json({ message: 'Aluno não encontrado.' });
    }

    const payload = await prepareStudentPayload(db, currentStudent, req.body);
    const assignments = editableStudentFields.map((field) => `${field} = ?`).join(', ');
    const values = editableStudentFields.map((field) => payload[field] || null);

    await db.run(
      `UPDATE alunos
       SET ${assignments}, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ?`,
      ...values,
      req.params.id
    );

    const student = await db.get(
      `SELECT a.*, e.nome AS empresa_nome
       FROM alunos a
       LEFT JOIN empresas e ON e.id = a.empresa_id
       WHERE a.id = ?`,
      req.params.id
    );

    res.json(student);
  })
);
