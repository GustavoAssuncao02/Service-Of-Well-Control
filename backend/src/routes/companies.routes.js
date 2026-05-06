import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const companyRoutes = Router();

companyRoutes.use(authenticate, requireAdmin);

function normalizeCompanyName(name) {
  return String(name || '').trim();
}

companyRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const companies = await db.all(
      `SELECT e.*,
              COUNT(a.id) AS total_alunos
       FROM empresas e
       LEFT JOIN alunos a ON a.empresa_id = e.id
       GROUP BY e.id
       ORDER BY e.nome ASC`
    );

    res.json(companies);
  })
);

companyRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeCompanyName(req.body.nome);

    if (!nome) {
      return res.status(400).json({ message: 'Nome da empresa é obrigatório.' });
    }

    const result = await db.run('INSERT INTO empresas (nome) VALUES (?)', nome);
    const company = await db.get('SELECT * FROM empresas WHERE id = ?', result.lastID);
    res.status(201).json(company);
  })
);

companyRoutes.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const nome = normalizeCompanyName(req.body.nome);

    if (!nome) {
      return res.status(400).json({ message: 'Nome da empresa é obrigatório.' });
    }

    const existingCompany = await db.get('SELECT * FROM empresas WHERE id = ?', req.params.id);
    if (!existingCompany) {
      return res.status(404).json({ message: 'Empresa não encontrada.' });
    }

    await db.exec('BEGIN');
    try {
      await db.run('UPDATE empresas SET nome = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', nome, req.params.id);
      await db.run('UPDATE alunos SET empresa = ?, atualizado_em = CURRENT_TIMESTAMP WHERE empresa_id = ?', nome, req.params.id);
      await db.exec('COMMIT');

      const company = await db.get('SELECT * FROM empresas WHERE id = ?', req.params.id);
      res.json(company);
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  })
);

companyRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const company = await db.get('SELECT * FROM empresas WHERE id = ?', req.params.id);

    if (!company) {
      return res.status(404).json({ message: 'Empresa não encontrada.' });
    }

    const usage = await db.get('SELECT COUNT(*) AS total FROM alunos WHERE empresa_id = ?', req.params.id);
    if (usage.total > 0) {
      return res.status(409).json({ message: 'Esta empresa está vinculada a um ou mais alunos.' });
    }

    await db.run('DELETE FROM empresas WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
