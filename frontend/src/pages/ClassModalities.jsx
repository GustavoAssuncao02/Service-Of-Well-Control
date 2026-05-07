import { Edit3, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';

const initialForm = { nome: '', descricao: '' };

export default function ClassModalities() {
  const [modalities, setModalities] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingModality, setEditingModality] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadModalities() {
    const { data } = await api.get('/class-modalities');
    setModalities(data);
  }

  useEffect(() => {
    loadModalities().catch((err) => setError(getApiError(err)));
  }, []);

  async function saveModality(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editingModality) {
        await api.put(`/class-modalities/${editingModality.id}`, form);
      } else {
        await api.post('/class-modalities', form);
      }

      setForm(initialForm);
      setEditingModality(null);
      await loadModalities();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeModality(id) {
    if (!confirm('Excluir modalidade?')) return;

    try {
      await api.delete(`/class-modalities/${id}`);
      await loadModalities();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function editModality(modality) {
    setEditingModality(modality);
    setForm({ nome: modality.nome, descricao: modality.descricao || '' });
  }

  function cancelEdit() {
    setEditingModality(null);
    setForm(initialForm);
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Cadastro academico</span>
        <h1>Modalidades de aula</h1>
        <p>Cadastre as modalidades usadas para classificar como cada aluno participa de uma turma.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h2>{editingModality ? 'Editar modalidade' : 'Nova modalidade'}</h2>
          </div>
          <form className="stack" onSubmit={saveModality}>
            <Field label="Nome">
              <input
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Presencial, Online, Presencial-carmopolis"
                required
              />
            </Field>
            <Field label="Descricao">
              <textarea value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} />
            </Field>
            <div className="inline-actions">
              <button className="primary-button" type="submit" disabled={saving}>
                <Save size={18} />
                {saving ? 'Salvando...' : editingModality ? 'Salvar modalidade' : 'Cadastrar modalidade'}
              </button>
              {editingModality ? (
                <button className="ghost-button" type="button" onClick={cancelEdit}>
                  <X size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Modalidades cadastradas</h2>
          </div>
          {modalities.length ? (
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Modalidade</th>
                    <th>Uso</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {modalities.map((modality) => (
                    <tr key={modality.id}>
                      <td>
                        <strong>{modality.nome}</strong>
                        {modality.descricao ? <small>{modality.descricao}</small> : null}
                      </td>
                      <td>
                        <strong>{modality.total_alunos || 0} alunos</strong>
                        <small>{modality.total_turmas || 0} turmas</small>
                      </td>
                      <td className="table-actions">
                        <button className="icon-button" type="button" onClick={() => editModality(modality)} aria-label="Editar modalidade">
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => removeModality(modality.id)} aria-label="Excluir modalidade">
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhuma modalidade" description="Cadastre as modalidades para usar na inclusao do aluno na turma." />
          )}
        </article>
      </section>
    </div>
  );
}
