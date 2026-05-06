import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { EmptyState } from '../components/Field.jsx';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [error, setError] = useState('');

  async function loadUsers() {
    const { data } = await api.get('/users', { params: { role: 'admin' } });
    setUsers(data);
  }

  useEffect(() => {
    loadUsers().catch((err) => setError(getApiError(err)));
  }, []);

  async function changeRole(userId, role) {
    setError('');
    setUpdatingUserId(userId);
    try {
      await api.patch(`/users/${userId}/role`, { role });
      await loadUsers();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Permissões</span>
        <h1>Usuários do sistema</h1>
        <p>Lista de usuários já aprovados para acessar o painel administrativo.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel">
        {users.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Permissão</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nome}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`status-badge ${user.role === 'admin' ? 'done' : 'active'}`}>{user.role}</span>
                    </td>
                    <td>
                      <button className="small-button" type="button" onClick={() => changeRole(user.id, 'pendente')} disabled={updatingUserId === user.id}>
                        <ShieldCheck size={15} />
                        {updatingUserId === user.id ? 'Atualizando...' : 'Suspender acesso'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem usuários aprovados" description="Aprove solicitações para liberar acesso ao sistema." />
        )}
      </section>
    </div>
  );
}
