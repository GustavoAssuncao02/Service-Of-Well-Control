import { Eye, Filter, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { isDoneStatus } from '../utils/display.js';

function handleRowKeyDown(event, action) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

export default function EvaluationControl() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvaluationId, setLoadingEvaluationId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/classes')
      .then((response) => setClasses(response.data))
      .catch((err) => setError(getApiError(err)));
  }, []);

  async function loadStatus(nextClassId = classId, nextFilter = filter) {
    if (!nextClassId) return;
    const params = nextFilter ? { filter: nextFilter } : {};
    const { data } = await api.get(`/classes/${nextClassId}/evaluation-status`, { params });
    setRows(data);
  }

  async function apply(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loadStatus();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function viewEvaluation(id) {
    setLoadingEvaluationId(id);
    try {
      const { data } = await api.get(`/evaluations/${id}`);
      setSelectedEvaluation(data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoadingEvaluationId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Pós-curso</span>
        <h1>Controle de avaliações</h1>
        <p>Acompanhe quem respondeu e quem ainda está pendente após a conclusão do aluno na turma.</p>
      </div>

      <section className="panel">
        <form className="filters" onSubmit={apply}>
          <Field label="Turma">
            <select value={classId} onChange={(event) => setClassId(event.target.value)} required>
              <option value="">Selecione</option>
              {classes.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.curso_nome} - {formatDate(turma.data_inicio)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Filtro">
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="responded">Respondidos</option>
              <option value="pending">Pendentes</option>
            </select>
          </Field>
          <button className="primary-button" type="submit" disabled={loading}>
            <Filter size={18} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </section>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Alunos</h2>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Status</th>
                  <th>Resposta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.aluno_id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/alunos/${row.aluno_id}`)}
                    onKeyDown={(event) => handleRowKeyDown(event, () => navigate(`/admin/alunos/${row.aluno_id}`))}
                  >
                    <td>{row.nome_completo}</td>
                    <td>{row.cpf}</td>
                    <td>
                      <span className={`status-badge ${row.avaliacao_id ? 'done' : isDoneStatus(row.status_turma) ? 'pending' : 'active'}`}>{row.status}</span>
                    </td>
                    <td>
                      {row.avaliacao_id ? (
                        <button
                          className="small-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            viewEvaluation(row.avaliacao_id);
                          }}
                          disabled={loadingEvaluationId === row.avaliacao_id}
                        >
                          <Eye size={15} />
                          {loadingEvaluationId === row.avaliacao_id ? 'Carregando...' : 'Visualizar'}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem dados" description="Selecione uma turma para consultar os alunos." />
        )}
      </section>

      {selectedEvaluation ? (
        <section className="panel detail-panel">
          <div className="panel-heading">
            <h2>Resposta individual</h2>
            <button className="icon-button" type="button" onClick={() => setSelectedEvaluation(null)} aria-label="Fechar">
              <XCircle size={18} />
            </button>
          </div>
          <div className="detail-grid">
            <div className="stack">
              <strong>{selectedEvaluation.aluno_nome}</strong>
              <span>{selectedEvaluation.curso_nome}</span>
              <span>{selectedEvaluation.instrutor_nome}</span>
              <span>Nota geral: {selectedEvaluation.nota_geral}/10</span>
              <span>Teste de Zoom: {selectedEvaluation.teste_zoom}</span>
            </div>
            <p>{selectedEvaluation.comentario || 'Sem comentário.'}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
