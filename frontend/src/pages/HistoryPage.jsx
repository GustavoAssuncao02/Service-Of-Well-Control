import { Filter } from 'lucide-react';
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

export default function HistoryPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ date: '', student: '', status: '', courseId: '', instructorId: '' });
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadHistory(nextFilters = filters) {
    const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
    const { data } = await api.get('/history', { params });
    setRows(data);
  }

  useEffect(() => {
    Promise.all([loadHistory(), api.get('/courses'), api.get('/instructors')])
      .then(([, courseResponse, instructorResponse]) => {
        setCourses(courseResponse.data);
        setInstructors(instructorResponse.data);
      })
      .catch((err) => setError(getApiError(err)));
  }, []);

  async function apply(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loadHistory(filters);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Registros</span>
        <h1>Histórico de cursos</h1>
        <p>Filtre por data, aluno, curso, instrutor e status de conclusão.</p>
      </div>

      <section className="panel">
        <form className="filters" onSubmit={apply}>
          <Field label="Data">
            <input type="date" value={filters.date} onChange={(event) => update('date', event.target.value)} />
          </Field>
          <Field label="Aluno ou CPF">
            <input value={filters.student} onChange={(event) => update('student', event.target.value)} />
          </Field>
          <Field label="Curso">
            <select value={filters.courseId} onChange={(event) => update('courseId', event.target.value)}>
              <option value="">Todos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instrutor">
            <select value={filters.instructorId} onChange={(event) => update('instructorId', event.target.value)}>
              <option value="">Todos</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={filters.status} onChange={(event) => update('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </Field>
          <button className="primary-button" type="submit" disabled={loading}>
            <Filter size={18} />
            {loading ? 'Filtrando...' : 'Filtrar'}
          </button>
        </form>
      </section>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel">
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>CPF</th>
                  <th>Curso</th>
                  <th>Instrutor</th>
                  <th>Período</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/alunos/${row.aluno_id}`)}
                    onKeyDown={(event) => handleRowKeyDown(event, () => navigate(`/admin/alunos/${row.aluno_id}`))}
                  >
                    <td>{row.aluno_nome}</td>
                    <td>{row.cpf}</td>
                    <td>{row.curso_nome}</td>
                    <td>{row.instrutor_nome}</td>
                    <td>
                      {formatDate(row.data_inicio)} a {formatDate(row.data_fim)}
                    </td>
                    <td>
                      <span className={`status-badge ${isDoneStatus(row.status) ? 'done' : 'active'}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem histórico" description="Nenhum registro encontrado para os filtros atuais." />
        )}
      </section>
    </div>
  );
}
