import { ArrowUpDown, ChevronDown, Download, FileImage, FileSpreadsheet, FileText, Filter, Search, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { downloadEvaluationsExcel, downloadEvaluationsPdf, downloadEvaluationsPng } from '../utils/evaluationReportExport.js';

const initialFilters = {
  search: '',
  startDate: '',
  endDate: '',
  classStartFrom: '',
  classStartTo: '',
  courseId: '',
  instructorId: '',
  classId: '',
  testZoom: '',
  hasComment: '',
  minScore: '',
  maxScore: ''
};

const emptyMetrics = {
  overall: { media_geral: 0, total_avaliacoes: 0 },
  byCourse: [],
  byInstructor: [],
  evolution: [],
  distribution: [],
  zoomTest: [],
  responseRate: []
};

const responseRateColumns = [
  { key: 'curso_nome', label: 'Turma' },
  { key: 'data_inicio', label: 'Periodo' },
  { key: 'total_respostas', label: 'Respostas' },
  { key: 'taxa_resposta', label: 'Taxa' }
];

const criteriaLabels = [
  'Conteudo apresentado',
  'Aplicabilidade',
  'Conhecimento do instrutor',
  'Desempenho do instrutor',
  'Estimulo a participacao',
  'Esclarecimento de duvidas',
  'Materiais utilizados',
  'Infraestrutura',
  'Carga horaria',
  'Participacao e interesse',
  'Pontualidade',
  'Cumprimento de tarefas',
  'Interacao',
  'Aprendizado'
];

function cleanParams(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
}

function numberValue(value) {
  return Number(value || 0);
}

function yesNoLabel(value) {
  if (value === 'yes') return 'Sim';
  if (value === 'no') return 'Nao';
  return '';
}

function formatNumber(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toFixed(decimals);
}

function responseRateSortValue(item, key) {
  if (key === 'curso_nome') return String(item.curso_nome || '').toLowerCase();
  if (key === 'data_inicio') return new Date(item.data_inicio || 0).getTime();
  if (key === 'total_respostas') return Number(item.total_respostas || 0);
  if (key === 'taxa_resposta') return Number(item.taxa_resposta || 0);
  return item[key] ?? '';
}

function classLabel(turma) {
  if (!turma) return '';
  return `${turma.curso_nome} - ${formatDate(turma.data_inicio)}`;
}

export default function EvaluationReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [summary, setSummary] = useState({
    total_avaliacoes: 0,
    media_geral: 0,
    menor_nota: 0,
    maior_nota: 0,
    total_cursos: 0,
    total_instrutores: 0,
    total_turmas: 0,
    total_comentarios: 0
  });
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [criteria, setCriteria] = useState({});
  const [evaluations, setEvaluations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [zoomTests, setZoomTests] = useState([]);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [responseRateSort, setResponseRateSort] = useState({ key: 'data_inicio', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const criteriaData = useMemo(
    () =>
      criteriaLabels.map((label, index) => ({
        label,
        media: numberValue(criteria[`nota_${index + 1}`])
      })),
    [criteria]
  );

  const zoomTestData = useMemo(
    () =>
      (metrics.zoomTest || []).map((item) => ({
        ...item,
        total: Number(item.total || 0),
        percentual: Number(item.percentual || 0)
      })),
    [metrics.zoomTest]
  );

  const sortedResponseRate = useMemo(() => {
    const directionMultiplier = responseRateSort.direction === 'asc' ? 1 : -1;

    return [...(metrics.responseRate || [])].sort((a, b) => {
      const firstValue = responseRateSortValue(a, responseRateSort.key);
      const secondValue = responseRateSortValue(b, responseRateSort.key);

      if (typeof firstValue === 'string' || typeof secondValue === 'string') {
        return String(firstValue).localeCompare(String(secondValue), 'pt-BR') * directionMultiplier;
      }

      return (Number(firstValue || 0) - Number(secondValue || 0)) * directionMultiplier;
    });
  }, [metrics.responseRate, responseRateSort]);

  const filtersSummary = useMemo(() => {
    const labels = [];
    if (activeFilters.search) labels.push(`Aluno: ${activeFilters.search}`);
    if (activeFilters.startDate) labels.push(`Avaliacao desde ${formatDate(activeFilters.startDate)}`);
    if (activeFilters.endDate) labels.push(`Avaliacao ate ${formatDate(activeFilters.endDate)}`);
    if (activeFilters.classStartFrom) labels.push(`Inicio turma desde ${formatDate(activeFilters.classStartFrom)}`);
    if (activeFilters.classStartTo) labels.push(`Inicio turma ate ${formatDate(activeFilters.classStartTo)}`);
    if (activeFilters.courseId) labels.push(`Curso: ${courses.find((item) => String(item.id) === String(activeFilters.courseId))?.nome || activeFilters.courseId}`);
    if (activeFilters.instructorId) labels.push(`Instrutor: ${instructors.find((item) => String(item.id) === String(activeFilters.instructorId))?.nome || activeFilters.instructorId}`);
    if (activeFilters.classId) labels.push(`Turma: ${classLabel(classes.find((item) => String(item.id) === String(activeFilters.classId))) || activeFilters.classId}`);
    if (activeFilters.testZoom) labels.push(`Teste Zoom: ${activeFilters.testZoom}`);
    if (activeFilters.hasComment) labels.push(`Tem comentario: ${yesNoLabel(activeFilters.hasComment)}`);
    if (activeFilters.minScore) labels.push(`Nota min.: ${activeFilters.minScore}`);
    if (activeFilters.maxScore) labels.push(`Nota max.: ${activeFilters.maxScore}`);

    return labels.join('; ') || 'Sem filtros';
  }, [activeFilters, courses, instructors, classes]);

  async function loadSupportData() {
    const [courseResponse, instructorResponse, classResponse, optionsResponse] = await Promise.all([
      api.get('/courses'),
      api.get('/instructors'),
      api.get('/classes'),
      api.get('/evaluations/report-options')
    ]);

    setCourses(courseResponse.data);
    setInstructors(instructorResponse.data);
    setClasses(classResponse.data);
    setZoomTests(optionsResponse.data.zoomTests || []);
  }

  async function loadReport(nextFilters = filters) {
    setError('');
    setLoading(true);
    try {
      const params = cleanParams(nextFilters);
      const [reportResponse, metricResponse] = await Promise.all([
        api.get('/evaluations/report', { params }),
        api.get('/evaluations/metrics', { params })
      ]);
      const { data } = reportResponse;
      setSummary(data.summary || {});
      setCriteria(data.criteria || {});
      setEvaluations(data.evaluations || []);
      setMetrics({ ...emptyMetrics, ...(metricResponse.data || {}) });
      setActiveFilters({ ...nextFilters });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupportData().catch((err) => setError(getApiError(err)));
    loadReport(initialFilters);
  }, []);

  function update(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    loadReport(filters);
  }

  function clearFilters() {
    setFilters(initialFilters);
    loadReport(initialFilters);
  }

  function applyChartFilter(extraFilters) {
    const nextFilters = { ...activeFilters, ...extraFilters };
    setFilters(nextFilters);
    loadReport(nextFilters);
  }

  function sortResponseRate(key) {
    setResponseRateSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Analise</span>
        <h1>Relatorio de avaliacoes</h1>
        <p>Filtre as avaliacoes de reacao, acompanhe a media dos resultados e exporte a base encontrada.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel report-filter-panel">
        <form className="filters report-filters" onSubmit={applyFilters}>
          <Field label="Buscar aluno" className="report-search-field">
            <div className="input-icon">
              <Search size={18} />
              <input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Nome, CPF, email ou telefone do aluno" />
            </div>
          </Field>
          <Field label="Avaliacao de">
            <input type="date" value={filters.startDate} onChange={(event) => update('startDate', event.target.value)} />
          </Field>
          <Field label="Avaliacao ate">
            <input type="date" value={filters.endDate} onChange={(event) => update('endDate', event.target.value)} />
          </Field>
          <Field label="Inicio turma de">
            <input type="date" value={filters.classStartFrom} onChange={(event) => update('classStartFrom', event.target.value)} />
          </Field>
          <Field label="Inicio turma ate">
            <input type="date" value={filters.classStartTo} onChange={(event) => update('classStartTo', event.target.value)} />
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
          <Field label="Turma">
            <select value={filters.classId} onChange={(event) => update('classId', event.target.value)}>
              <option value="">Todas</option>
              {classes.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {classLabel(turma)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Teste Zoom">
            <select value={filters.testZoom} onChange={(event) => update('testZoom', event.target.value)}>
              <option value="">Todos</option>
              {zoomTests.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tem comentario">
            <select value={filters.hasComment} onChange={(event) => update('hasComment', event.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Sim</option>
              <option value="no">Nao</option>
            </select>
          </Field>
          <Field label="Nota min.">
            <input type="number" min="0" max="10" step="0.1" value={filters.minScore} onChange={(event) => update('minScore', event.target.value)} />
          </Field>
          <Field label="Nota max.">
            <input type="number" min="0" max="10" step="0.1" value={filters.maxScore} onChange={(event) => update('maxScore', event.target.value)} />
          </Field>
          <div className="report-actions">
            <button className="primary-button" type="submit" disabled={loading}>
              <Filter size={18} />
              {loading ? 'Gerando...' : 'Gerar relatorio'}
            </button>
            <button className="ghost-button" type="button" onClick={clearFilters} disabled={loading}>
              <X size={16} />
              Limpar
            </button>
          </div>
        </form>
      </section>

      <section className="metrics-grid">
        <article className="metric">
          <span>Media dos filtros</span>
          <strong>{formatNumber(summary.media_geral, 2)}</strong>
        </article>
        <article className="metric">
          <span>Avaliacoes no relatorio</span>
          <strong>{summary.total_avaliacoes || 0}</strong>
        </article>
        <article className="metric">
          <span>Menor / maior nota</span>
          <strong>
            {formatNumber(summary.menor_nota, 1)} / {formatNumber(summary.maior_nota, 1)}
          </strong>
        </article>
        <article className="metric">
          <span>Com comentarios</span>
          <strong>{summary.total_comentarios || 0}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Media por curso</h2>
              <small>Clique em uma barra para filtrar o relatorio.</small>
            </div>
          </div>
          {metrics.byCourse.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.byCourse}
                  onClick={(state) => {
                    const course = state?.activePayload?.[0]?.payload;
                    if (course?.id) applyChartFilter({ courseId: String(course.id), classId: '' });
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip formatter={(value, name, item) => [`${formatNumber(value, 2)} (${item.payload.total || 0} respostas)`, 'Media']} />
                  <Bar dataKey="media" fill="#2f80c3" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem medias por curso" description="As medias aparecem conforme as avaliacoes filtradas." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Media por instrutor</h2>
              <small>Clique em uma barra para filtrar o relatorio.</small>
            </div>
          </div>
          {metrics.byInstructor.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.byInstructor}
                  onClick={(state) => {
                    const instructor = state?.activePayload?.[0]?.payload;
                    if (instructor?.id) applyChartFilter({ instructorId: String(instructor.id), classId: '' });
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip formatter={(value, name, item) => [`${formatNumber(value, 2)} (${item.payload.total || 0} respostas)`, 'Media']} />
                  <Bar dataKey="media" fill="#ff7a1a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem medias por instrutor" description="As medias aparecem conforme as avaliacoes filtradas." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Evolucao das notas</h2>
              <small>Media mensal das avaliacoes de reacao.</small>
            </div>
          </div>
          {metrics.evolution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.evolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip formatter={(value, name, item) => [`${formatNumber(value, 2)} (${item.payload.total || 0} respostas)`, 'Media']} />
                  <Line type="monotone" dataKey="media" stroke="#183b78" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem evolucao" description="O historico aparece conforme as avaliacoes filtradas." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Distribuicao de notas</h2>
              <small>Quantidade de avaliacoes por nota arredondada.</small>
            </div>
          </div>
          {metrics.distribution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.distribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nota" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [value, 'Avaliacoes']} />
                  <Bar dataKey="total" fill="#18a058" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem distribuicao" description="A contagem por nota aparece conforme as avaliacoes filtradas." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Teste no Zoom</h2>
              <small>Percentual de participantes que fizeram ou nao fizeram o teste.</small>
            </div>
          </div>
          {zoomTestData.some((item) => item.total > 0) ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoomTestData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value, name, item) => [`${formatNumber(value, 1)}% (${item.payload.total || 0})`, 'Percentual']} />
                  <Bar dataKey="percentual" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem dados de Zoom" description="Os percentuais aparecem conforme as avaliacoes filtradas." />
          )}
        </article>
      </section>

      <section className="panel response-rate-panel">
        <div className="panel-heading">
          <div>
            <h2>Taxa de resposta por turma</h2>
            <small>Compara alunos concluidos e avaliacoes recebidas.</small>
          </div>
        </div>
        {metrics.responseRate.length ? (
          <div className="table-wrap response-rate-scroll">
            <table>
              <thead>
                <tr>
                  {responseRateColumns.map((column) => (
                    <th key={column.key}>
                      <button className="table-sort-button" type="button" onClick={() => sortResponseRate(column.key)}>
                        {column.label}
                        <ArrowUpDown size={14} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResponseRate.map((item) => (
                  <tr key={item.id}>
                    <td>{item.curso_nome}</td>
                    <td>
                      {formatDate(item.data_inicio)} a {formatDate(item.data_fim)}
                    </td>
                    <td>
                      {item.total_respostas || 0}/{item.total_alunos || 0}
                    </td>
                    <td>{formatNumber(item.taxa_resposta, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem taxa de resposta" description="As turmas concluidas aparecem conforme os filtros." />
        )}
      </section>

      <section className={`panel collapsible-panel ${criteriaOpen ? 'is-open' : ''}`}>
        <button className="collapsible-heading" type="button" onClick={() => setCriteriaOpen((value) => !value)} aria-expanded={criteriaOpen}>
          <div>
            <h2>Media por criterio</h2>
            <small>Calculada sobre as avaliacoes filtradas.</small>
          </div>
          <ChevronDown className="collapsible-chevron" size={20} />
        </button>
        <div className="collapsible-content">
          <div>
            <div className="criteria-list">
              {criteriaData.map((criterion, index) => (
                <div key={criterion.label}>
                  <span>
                    {index + 1}. {criterion.label}
                  </span>
                  <strong>{criterion.media.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Resultado</h2>
            <small>{filtersSummary}</small>
          </div>
          <div className="inline-actions">
            <button className="ghost-button" type="button" onClick={() => downloadEvaluationsPdf(evaluations, summary, filtersSummary)} disabled={!evaluations.length}>
              <FileText size={16} />
              PDF
            </button>
            <button className="ghost-button" type="button" onClick={() => downloadEvaluationsPng(evaluations, summary, filtersSummary)} disabled={!evaluations.length}>
              <FileImage size={16} />
              PNG
            </button>
            <button className="ghost-button" type="button" onClick={() => downloadEvaluationsExcel(evaluations)} disabled={!evaluations.length}>
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button className="ghost-button" type="button" onClick={() => loadReport(activeFilters)} disabled={loading}>
              <Download size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {evaluations.length ? (
          <div className="table-wrap report-preview-table">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Curso</th>
                  <th>Instrutor</th>
                  <th>Turma</th>
                  <th>Nota</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr
                    key={evaluation.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/avaliacoes/${evaluation.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/admin/avaliacoes/${evaluation.id}`);
                      }
                    }}
                  >
                    <td>
                      <button
                        className="table-link-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/admin/alunos/${evaluation.aluno_id}`);
                        }}
                      >
                        {evaluation.aluno_nome}
                      </button>
                      <small>{evaluation.cpf}</small>
                    </td>
                    <td>{evaluation.curso_nome}</td>
                    <td>{evaluation.instrutor_nome}</td>
                    <td>
                      {formatDate(evaluation.data_inicio)} a {formatDate(evaluation.data_fim)}
                    </td>
                    <td>{formatNumber(evaluation.nota_geral, 2)}</td>
                    <td className="table-actions">
                      <button
                        className="small-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/admin/avaliacoes/${evaluation.id}`);
                        }}
                      >
                        <UserRound size={15} />
                        Gerar avaliacao
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma avaliacao encontrada" description="Ajuste os filtros para ampliar o resultado." />
        )}
      </section>
    </div>
  );
}
