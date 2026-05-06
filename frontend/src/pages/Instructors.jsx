import { Edit3, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';

export default function Instructors() {
  const [instructors, setInstructors] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadInstructors() {
    const { data } = await api.get('/instructors');
    setInstructors(data);
  }

  useEffect(() => {
    loadInstructors().catch((err) => setError(getApiError(err)));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editing) {
        await api.put(`/instructors/${editing.id}`, { nome: name });
      } else {
        await api.post('/instructors', { nome: name });
      }
      setName('');
      setEditing(null);
      await loadInstructors();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeInstructor(id) {
    if (!confirm('Excluir instrutor?')) return;
    try {
      await api.delete(`/instructors/${id}`);
      await loadInstructors();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function startEdit(instructor) {
    setEditing(instructor);
    setName(instructor.nome);
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Equipe</span>
        <h1>Instrutores</h1>
        <p>Cadastre, edite e remova instrutores disponíveis para turmas.</p>
      </div>

      <section className="panel">
        <form className="inline-form" onSubmit={handleSubmit}>
          <Field label="Nome do instrutor">
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
          <h2>Lista de instrutores</h2>
        </div>
        {instructors.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((instructor) => (
                  <tr key={instructor.id}>
                    <td>{instructor.nome}</td>
                    <td className="table-actions">
                      <button className="icon-button" type="button" onClick={() => startEdit(instructor)} aria-label="Editar">
                        <Edit3 size={17} />
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => removeInstructor(instructor.id)} aria-label="Excluir">
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhum instrutor" description="Adicione o primeiro instrutor para criar turmas." />
        )}
      </section>
    </div>
  );
}
