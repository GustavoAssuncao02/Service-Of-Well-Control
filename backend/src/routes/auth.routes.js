import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../database/db.js';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidCpf, onlyDigits } from '../utils/format.js';

export const authRoutes = Router();

const studentFields = [
  'nome_completo',
  'data_nascimento',
  'telefone',
  'cpf',
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
  'funcao_outro'
];

const requiredStudentFields = [
  'nome_completo',
  'data_nascimento',
  'telefone',
  'cpf',
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
];

function publicStudentPayload(student) {
  return {
    id: student.id,
    nome_completo: student.nome_completo,
    data_nascimento: student.data_nascimento,
    telefone: student.telefone,
    cpf: student.cpf,
    email: student.email,
    sexo: student.sexo,
    sexo_outro: student.sexo_outro,
    cep: student.cep,
    rua: student.rua,
    bairro: student.bairro,
    numero: student.numero,
    cidade: student.cidade,
    estado: student.estado,
    responsavel_inscricao: student.responsavel_inscricao,
    empresa_id: student.empresa_id,
    empresa: student.empresa,
    sonda_unidade: student.sonda_unidade,
    operacao: student.operacao,
    funcao: student.funcao,
    funcao_outro: student.funcao_outro
  };
}

async function prepareStudentPayload(db, payload) {
  const missing = requiredStudentFields.filter((field) => !payload[field]);

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

  if (!isValidCpf(payload.cpf)) {
    const error = new Error('Informe um CPF válido.');
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

  preparedPayload.cpf = onlyDigits(preparedPayload.cpf);
  return preparedPayload;
}

function signUser(user) {
  return jwt.sign(
    {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

authRoutes.post(
  '/register',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const payload = req.body;

    const missing = ['nome_completo', 'data_nascimento', 'telefone', 'cpf', 'email', 'sexo', 'cep', 'rua', 'bairro', 'numero', 'cidade', 'estado', 'responsavel_inscricao', 'sonda_unidade', 'operacao', 'funcao'].filter(
      (field) => !payload[field]
    );

    if (missing.length) {
      return res.status(400).json({ message: `Campos obrigatórios ausentes: ${missing.join(', ')}` });
    }

    if (payload.sexo === 'Outro' && !payload.sexo_outro) {
      return res.status(400).json({ message: 'Informe o sexo quando selecionar Outro.' });
    }

    if (!isValidCpf(payload.cpf)) {
      return res.status(400).json({ message: 'Informe um CPF válido.' });
    }

    const preparedPayload = { ...payload };
    if (payload.responsavel_inscricao === 'Empresa') {
      if (!payload.empresa_id) {
        return res.status(400).json({ message: 'Selecione a empresa responsável pela inscrição.' });
      }

      const company = await db.get('SELECT id, nome FROM empresas WHERE id = ?', payload.empresa_id);
      if (!company) {
        return res.status(404).json({ message: 'Empresa não encontrada.' });
      }

      preparedPayload.empresa_id = company.id;
      preparedPayload.empresa = company.nome;
    } else {
      preparedPayload.empresa_id = null;
      preparedPayload.empresa = null;
    }

    if (preparedPayload.funcao === 'Outro' && !preparedPayload.funcao_outro) {
      return res.status(400).json({ message: 'Informe a função quando selecionar Outro.' });
    }

    const normalizedCpf = onlyDigits(preparedPayload.cpf);
    const existingStudent = await db.get('SELECT id FROM alunos WHERE cpf = ?', normalizedCpf);

    if (existingStudent) {
      return res.status(409).json({
        code: 'STUDENT_ALREADY_EXISTS',
        message: 'Identificamos que você já possui um cadastro. Atualize as informações e clique em Concluir cadastro.'
      });
    }

    const emailOwner = await db.get('SELECT id FROM alunos WHERE email = ?', preparedPayload.email);
    if (emailOwner) {
      return res.status(400).json({ message: 'Este email já está vinculado a outro aluno.' });
    }

    const values = studentFields.map((field) => (field === 'cpf' ? normalizedCpf : preparedPayload[field] || null));
    const result = await db.run(
      `INSERT INTO alunos (
        nome_completo, data_nascimento, telefone, cpf, email, sexo, sexo_outro,
        cep, rua, bairro, numero, cidade, estado, responsavel_inscricao, empresa_id,
        empresa, sonda_unidade, operacao, funcao, funcao_outro
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...values
    );

    const student = await db.get('SELECT * FROM alunos WHERE id = ?', result.lastID);
    res.status(201).json({ student, message: 'Cadastro de aluno enviado com sucesso.' });
  })
);

authRoutes.post(
  '/register/lookup',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const cpf = onlyDigits(req.body.cpf);

    if (!isValidCpf(cpf)) {
      return res.status(400).json({ message: 'Informe um CPF válido.' });
    }

    const student = await db.get('SELECT * FROM alunos WHERE cpf = ?', cpf);
    res.json({ exists: Boolean(student), student: student ? publicStudentPayload(student) : null });
  })
);

authRoutes.put(
  '/register/complete',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const payload = await prepareStudentPayload(db, req.body);
    const currentStudent = await db.get('SELECT * FROM alunos WHERE cpf = ?', payload.cpf);

    if (!currentStudent) {
      return res.status(404).json({ message: 'Cadastro não encontrado para este CPF.' });
    }

    const emailOwner = await db.get('SELECT id FROM alunos WHERE email = ? AND id <> ?', payload.email, currentStudent.id);
    if (emailOwner) {
      return res.status(400).json({ message: 'Este email já está vinculado a outro aluno.' });
    }

    const editableFields = studentFields.filter((field) => field !== 'cpf');
    const assignments = editableFields.map((field) => `${field} = ?`).join(', ');
    const values = editableFields.map((field) => payload[field] || null);

    await db.run(
      `UPDATE alunos
       SET ${assignments}, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ?`,
      ...values,
      currentStudent.id
    );

    const student = await db.get('SELECT * FROM alunos WHERE id = ?', currentStudent.id);
    res.json({ student: publicStudentPayload(student), message: 'Cadastro atualizado com sucesso.' });
  })
);

authRoutes.post(
  '/request-access',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { nome, email, password } = req.body;

    if (!nome || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      `INSERT INTO usuarios (nome, email, senha_hash, role)
       VALUES (?, ?, ?, 'pendente')`,
      nome,
      email,
      hash
    );

    const user = await db.get('SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = ?', result.lastID);
    res.status(201).json({ user, message: 'Solicitação enviada. Aguarde a aprovação de um administrador.' });
  })
);

authRoutes.post(
  '/login',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM usuarios WHERE email = ?', email);

    if (!user) {
      return res.status(401).json({ message: 'Email ou senha inválidos.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.senha_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Email ou senha inválidos.' });
    }

    if (user.role === 'pendente') {
      return res.status(403).json({ message: 'Sua solicitação de acesso ainda está aguardando aprovação.' });
    }

    const publicUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role
    };

    res.json({ user: publicUser, token: signUser(publicUser) });
  })
);

authRoutes.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const user = await db.get('SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = ?', req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.json(user);
  })
);
