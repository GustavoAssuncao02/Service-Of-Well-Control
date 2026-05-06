import { Edit3, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadCompanies() {
    const { data } = await api.get('/companies');
    setCompanies(data);
  }

  useEffect(() => {
    loadCompanies().catch((err) => setError(getApiError(err)));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editing) {
        await api.put(`/companies/${editing.id}`, { nome: name });
      } else {
        await api.post('/companies', { nome: name });
      }
      setName('');
      setEditing(null);
      await loadCompanies();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeCompany(id) {
    if (!confirm('Excluir empresa?')) return;
    try {
      await api.delete(`/companies/${id}`);
      await loadCompanies();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function startEdit(company) {
    setEditing(company);
    setName(company.nome);
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Cadastros</span>
        <h1>Empresas</h1>
        <p>Cadastre, edite e remova as empresas disponíveis no formulário público de inscrição.</p>
      </div>

      <section className="panel">
        <form className="inline-form" onSubmit={handleSubmit}>
          <Field label="Nome da empresa">
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <button className="primary-button" type="submit" disabled={saving}>
            <Save size={18} />
            {saving ? (editing ? 'Salvando...' : 'Cadastrando...') : editing ? 'Salvar edição' : 'Cadastrar'}
          </button>
          {editing ? (
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setEditing(null);
                setName('');
              }}
            >
              <X size={16} />
              Cancelar
            </button>
          ) : null}
        </form>
        {error ? <div className="alert error">{error}</div> : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Empresas cadastradas</h2>
        </div>
        {companies.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Alunos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.nome}</td>
                    <td>{company.total_alunos || 0}</td>
                    <td className="table-actions">
                      <button className="icon-button" type="button" onClick={() => startEdit(company)} aria-label="Editar">
                        <Edit3 size={17} />
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => removeCompany(company.id)} aria-label="Excluir">
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma empresa" description="Adicione empresas para que os alunos possam selecioná-las na inscrição." />
        )}
      </section>
    </div>
  );
}
