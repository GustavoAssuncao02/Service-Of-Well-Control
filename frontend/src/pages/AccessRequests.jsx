import { CheckCircle2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { EmptyState } from '../components/Field.jsx';

export default function AccessRequests() {
  const [requests, setRequests] = useState([]);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [error, setError] = useState('');

  async function loadRequests() {
    const { data } = await api.get('/users', { params: { role: 'pendente' } });
    setRequests(data);
  }

  useEffect(() => {
    loadRequests().catch((err) => setError(getApiError(err)));
  }, []);

  async function approve(userId) {
    setError('');
    setUpdatingUserId(userId);
    try {
      await api.patch(`/users/${userId}/approve-admin`);
      await loadRequests();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function reject(userId) {
    if (!confirm('Recusar esta solicitação?')) return;

    setError('');
    setUpdatingUserId(userId);
    try {
      await api.delete(`/users/${userId}`);
      await loadRequests();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setUpdatingUserId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Acesso ao sistema</span>
        <h1>Solicitações de usuários</h1>
        <p>Aprove apenas quem deve ter acesso administrativo ao sistema.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel">
        {requests.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.nome}</td>
                    <td>{request.email}</td>
                    <td>
                      <span className="status-badge pending">Pendente</span>
                    </td>
                    <td className="table-actions">
                      <button className="small-button success" type="button" onClick={() => approve(request.id)} disabled={updatingUserId === request.id}>
                        <CheckCircle2 size={15} />
                        {updatingUserId === request.id ? 'Aprovando...' : 'Aprovar'}
                      </button>
                      <button className="small-button danger" type="button" onClick={() => reject(request.id)} disabled={updatingUserId === request.id}>
                        <Trash2 size={15} />
                        {updatingUserId === request.id ? 'Recusando...' : 'Recusar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem solicitações" description="Novos pedidos de acesso administrativo aparecerão aqui." />
        )}
      </section>
    </div>
  );
}
