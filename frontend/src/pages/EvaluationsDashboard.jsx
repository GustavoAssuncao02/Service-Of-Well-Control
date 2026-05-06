import { Filter, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';

const criteriaLabels = [
  'Conteúdo apresentado',
  'Aplicabilidade',
  'Conhecimento do instrutor',
  'Desempenho do instrutor',
  'Estímulo à participação',
  'Esclarecimento de dúvidas',
  'Materiais utilizados',
  'Infraestrutura',
  'Carga horária',
  'Participação e interesse',
  'Pontualidade',
  'Cumprimento de tarefas',
  'Interação',
  'Aprendizado'
];

function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function filterEvaluations(evaluations, search) {
  const term = normalizeSearchText(search).trim();
  if (!term) return evaluations;

  return evaluations.filter((evaluation) =>
    normalizeSearchText(
      [
        evaluation.id,
        evaluation.aluno_nome,
        evaluation.cpf,
        evaluation.curso_nome,
        evaluation.instrutor_nome,
        evaluation.nota_geral,
        formatDate(evaluation.data_avaliacao),
        evaluation.comentario
      ].join(' ')
    ).includes(term)
  );
}

function Metric({ label, value }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function EvaluationsDashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ courseId: '', instructorId: '', classId: '', startDate: '', endDate: '' });
  const [metrics, setMetrics] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailTitle, setDetailTitle] = useState('');
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);
  const [evaluationSearch, setEvaluationSearch] = useState('');
  const [activeEvaluationSearch, setActiveEvaluationSearch] = useState('');
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const detailPanelRef = useRef(null);

  const selectedEvaluation = useMemo(
    () => details?.evaluations?.find((evaluation) => String(evaluation.id) === String(selectedEvaluationId)) || null,
    [details, selectedEvaluationId]
  );

  const criteriaData = useMemo(() => {
    const source = selectedEvaluation || details?.criteria || metrics?.criteria || {};
    return criteriaLabels.map((label, index) => ({
      label,
      media: Number(source[`nota_${index + 1}`] || 0)
    }));
  }, [details, metrics, selectedEvaluation]);

  const zoomTestData = useMemo(
    () =>
      (metrics?.zoomTest || []).map((item) => ({
        ...item,
        total: Number(item.total || 0),
        percentual: Number(item.percentual || 0)
      })),
    [metrics]
  );

  const filteredEvaluations = useMemo(
    () => filterEvaluations(details?.evaluations || [], activeEvaluationSearch),
    [details, activeEvaluationSearch]
  );

  async function loadMetrics(nextFilters = filters) {
    const params = cleanParams(nextFilters);
    const { data } = await api.get('/evaluations/metrics', { params });
    setMetrics(data);
    setDetails(null);
    setDetailTitle('');
    setSelectedEvaluationId(null);
    setActiveEvaluationSearch('');
  }

  async function loadDetails(extra = {}, options = {}) {
    const params = cleanParams({ ...filters, ...extra });
    setLoadingDetails(true);
    try {
      const { data } = await api.get('/evaluations/details', { params });
      setDetails(data);
      setSelectedEvaluationId(null);
      if (options.title) {
        setDetailTitle(options.title);
      } else if (extra.courseId) {
        const course = courses.find((item) => String(item.id) === String(extra.courseId));
        setDetailTitle(course ? `Detalhamento: ${course.nome}` : 'Detalhamento do curso');
      } else if (extra.instructorId) {
        const instructor = instructors.find((item) => String(item.id) === String(extra.instructorId));
        setDetailTitle(instructor ? `Detalhamento: ${instructor.nome}` : 'Detalhamento do instrutor');
      } else {
        setDetailTitle('Detalhamento');
      }

      return data;
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    Promise.all([api.get('/courses'), api.get('/instructors'), api.get('/classes'), api.get('/evaluations/metrics')])
      .then(([courseResponse, instructorResponse, classResponse, metricResponse]) => {
        setCourses(courseResponse.data);
        setInstructors(instructorResponse.data);
        setClasses(classResponse.data);
        setMetrics(metricResponse.data);
      })
      .catch((err) => setError(getApiError(err)));
  }, []);

  useEffect(() => {
    if (!details) return;

    window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [details]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    setError('');
    setLoadingFilters(true);
    try {
      await loadMetrics(filters);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoadingFilters(false);
    }
  }

  async function requestDetails(extra = {}) {
    setError('');
    setActiveEvaluationSearch('');
    try {
      await loadDetails(extra);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function searchEvaluation(event) {
    event?.preventDefault();
    setError('');
    const term = evaluationSearch.trim();

    try {
      const data = await loadDetails({}, { title: term ? `Busca: avaliação de reação` : 'Avaliações de reação' });
      setActiveEvaluationSearch(term);
      const matches = filterEvaluations(data.evaluations || [], term);

      if (matches.length === 1) {
        setSelectedEvaluationId(matches[0].id);
      }
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function toggleSelectedEvaluation(evaluationId) {
    setSelectedEvaluationId((currentId) => (String(currentId) === String(evaluationId) ? null : evaluationId));
  }

  function handleEvaluationKeyDown(event, evaluationId) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleSelectedEvaluation(evaluationId);
    }
  }

  function openStudentProfile(event, studentId) {
    event.stopPropagation();
    navigate(`/admin/alunos/${studentId}`);
  }

  if (error) {
    return <div className="alert error">{error}</div>;
  }

  if (!metrics) {
    return <div className="loading">Carregando avaliações...</div>;
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Qualidade dos cursos</span>
        <h1>Dashboard de avaliações</h1>
        <p>Médias, distribuição de notas, evolução e taxa de resposta por turma.</p>
      </div>

      <section className="panel">
        <form className="filters" onSubmit={applyFilters}>
          <Field label="Curso">
            <select value={filters.courseId} onChange={(event) => updateFilter('courseId', event.target.value)}>
              <option value="">Todos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instrutor">
            <select value={filters.instructorId} onChange={(event) => updateFilter('instructorId', event.target.value)}>
              <option value="">Todos</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Turma">
            <select value={filters.classId} onChange={(event) => updateFilter('classId', event.target.value)}>
              <option value="">Todas</option>
              {classes.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.curso_nome} - {formatDate(turma.data_inicio)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Início">
            <input type="date" value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} />
          </Field>
          <Field label="Fim">
            <input type="date" value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} />
          </Field>
          <Field label="Avaliação de reação">
            <input
              placeholder="Nome, CPF, curso ou comentário"
              value={evaluationSearch}
              onChange={(event) => setEvaluationSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  searchEvaluation(event);
                }
              }}
            />
          </Field>
          <button className="primary-button" type="submit" disabled={loadingFilters}>
            <Filter size={18} />
            {loadingFilters ? 'Aplicando...' : 'Aplicar'}
          </button>
          <button className="ghost-button" type="button" onClick={searchEvaluation} disabled={loadingDetails}>
            <Search size={18} />
            {loadingDetails ? 'Buscando...' : 'Buscar avaliação'}
          </button>
        </form>
      </section>

      <section className="metrics-grid">
        <Metric label="Nota média geral" value={Number(metrics.overall.media_geral || 0).toFixed(1)} />
        <Metric label="Total de avaliações" value={metrics.overall.total_avaliacoes} />
        <Metric label="Cursos avaliados" value={metrics.byCourse.length} />
        <Metric label="Instrutores avaliados" value={metrics.byInstructor.length} />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>Média por curso</h2>
            <small>Clique em uma barra para detalhar.</small>
          </div>
          {metrics.byCourse.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byCourse} onClick={(state) => state?.activePayload?.[0]?.payload && requestDetails({ courseId: state.activePayload[0].payload.id })}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Bar dataKey="media" fill="#2f80c3" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem avaliações" description="As médias aparecem após o primeiro envio." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Média por instrutor</h2>
            <small>Clique em uma barra para detalhar.</small>
          </div>
          {metrics.byInstructor.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byInstructor} onClick={(state) => state?.activePayload?.[0]?.payload && requestDetails({ instructorId: state.activePayload[0].payload.id })}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Bar dataKey="media" fill="#ff7a1a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem avaliações" description="As médias aparecem após o primeiro envio." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Evolução das notas</h2>
          </div>
          {metrics.evolution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.evolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="periodo" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="media" stroke="#183b78" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem evolução" description="O histórico será desenhado mês a mês." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Distribuição de notas</h2>
          </div>
          {metrics.distribution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.distribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nota" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#18a058" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem distribuição" description="A contagem por nota aparece após avaliações." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Teste no Zoom</h2>
            <small>Percentual de participantes que fizeram ou nao fizeram o teste.</small>
          </div>
          {zoomTestData.some((item) => item.total > 0) ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoomTestData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value, name, item) => [`${Number(value).toFixed(1)}% (${item.payload.total})`, 'Percentual']} />
                  <Bar dataKey="percentual" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem dados de Zoom" description="Os percentuais aparecem apos o envio das avaliacoes." />
          )}
        </article>
      </section>

      <section className="panel response-rate-panel">
        <div className="panel-heading">
          <h2>Taxa de resposta por turma</h2>
        </div>
        <div className="table-wrap response-rate-scroll">
          <table>
            <thead>
              <tr>
                <th>Turma</th>
                <th>Período</th>
                <th>Respostas</th>
                <th>Taxa</th>
              </tr>
            </thead>
            <tbody>
              {metrics.responseRate.map((item) => (
                <tr key={item.id}>
                  <td>{item.curso_nome}</td>
                  <td>
                    {formatDate(item.data_inicio)} a {formatDate(item.data_fim)}
                  </td>
                  <td>
                    {item.total_respostas || 0}/{item.total_alunos || 0}
                  </td>
                  <td>{item.taxa_resposta || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loadingDetails ? <div className="loading">Carregando detalhamento...</div> : null}

      {details ? (
        <section id="detalhamento-avaliacoes" ref={detailPanelRef} className="panel">
          <div className="panel-heading">
            <h2>{detailTitle || 'Detalhamento'}</h2>
            <small>
              {activeEvaluationSearch
                ? `${filteredEvaluations.length} resultado(s) para "${activeEvaluationSearch}".`
                : 'Aberto a partir do gráfico selecionado.'}
            </small>
          </div>
          <div className="detail-grid">
            <div>
              <Metric
                label={selectedEvaluation ? 'Nota geral do cliente' : 'Média geral filtrada'}
                value={Number((selectedEvaluation || details.overall).nota_geral || details.overall.media_geral || 0).toFixed(1)}
              />
              <div className="criteria-list">
                {criteriaData.map((criterion, index) => (
                  <div key={criterion.label}>
                    <span>
                      {index + 1}. {criterion.label}
                    </span>
                    <strong>{criterion.media.toFixed(1)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="comments-list">
              {filteredEvaluations.length ? (
                filteredEvaluations.map((evaluation) => {
                  const isSelected = String(selectedEvaluationId) === String(evaluation.id);

                  return (
                    <article
                      key={evaluation.id}
                      className={`comment-item ${isSelected ? 'selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => toggleSelectedEvaluation(evaluation.id)}
                      onKeyDown={(event) => handleEvaluationKeyDown(event, evaluation.id)}
                    >
                      <strong>
                        <Star size={16} />
                        <span className="comment-score">{evaluation.nota_geral}/10 -</span>
                        <button className="comment-person-link" type="button" onClick={(event) => openStudentProfile(event, evaluation.aluno_id)}>
                          {evaluation.aluno_nome}
                        </button>
                      </strong>
                      <span>
                        {evaluation.curso_nome} com {evaluation.instrutor_nome} em {formatDate(evaluation.data_avaliacao)}
                      </span>
                      <p>{evaluation.comentario || 'Sem comentário.'}</p>
                    </article>
                  );
                })
              ) : (
                <EmptyState
                  title={details.evaluations.length ? 'Nenhuma avaliação encontrada' : 'Sem respostas no detalhe'}
                  description={details.evaluations.length ? 'Revise o termo pesquisado.' : 'Ajuste os filtros ou clique em outra barra.'}
                />
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
