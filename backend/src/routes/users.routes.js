import { Router } from 'express';
import { getDb } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const userRoutes = Router();

userRoutes.use(authenticate, requireAdmin);

userRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const params = [];
    const where = req.query.role ? 'WHERE role = ?' : '';

    if (req.query.role) {
      params.push(req.query.role);
    }

    const users = await db.all(
      `SELECT id, nome, email, role, criado_em
       FROM usuarios
       ${where}
       ORDER BY criado_em DESC`,
      params
    );

    res.json(users);
  })
);

userRoutes.patch(
  '/:id/role',
  asyncHandler(async (req, res) => {
    const db = await getDb();
    const { role } = req.body;

    if (!['aluno', 'admin', 'pendente'].includes(role)) {
      return res.status(400).json({ message: 'Tipo de usuário inválido.' });
    }

    if (Number(req.params.id) === req.user.id && role !== 'admin') {
      return res.status(400).json({ message: 'Você não pode suspender o próprio acesso.' });
    }

    await db.run('UPDATE usuarios SET role = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', role, req.params.id);
    const user = await db.get('SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = ?', req.params.id);

    res.json(user);
  })
);

userRoutes.patch(
  '/:id/approve-admin',
  asyncHandler(async (req, res) => {
    const db = await getDb();

    await db.run("UPDATE usuarios SET role = 'admin', atualizado_em = CURRENT_TIMESTAMP WHERE id = ?", req.params.id);
    const user = await db.get('SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = ?', req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.json(user);
  })
);

userRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const db = await getDb();

    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Você não pode remover o próprio usuário.' });
    }

    await db.run('DELETE FROM usuarios WHERE id = ?', req.params.id);
    res.status(204).send();
  })
);
