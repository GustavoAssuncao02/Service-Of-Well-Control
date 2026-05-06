import { ChevronDown, Download, FileSpreadsheet, FileText, Filter, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { downloadEvaluationsExcel, downloadEvaluationsPdf } from '../utils/evaluationReportExport.js';

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
  const [criteria, setCriteria] = useState({});
  const [evaluations, setEvaluations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [zoomTests, setZoomTests] = useState([]);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
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
      const { data } = await api.get('/evaluations/report', { params });
      setSummary(data.summary || {});
      setCriteria(data.criteria || {});
      setEvaluations(data.evaluations || []);
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
                  <th>Avaliacao</th>
                  <th>Nota</th>
                  <th>Zoom</th>
                  <th>Comentario</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr
                    key={evaluation.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/alunos/${evaluation.aluno_id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/admin/alunos/${evaluation.aluno_id}`);
                      }
                    }}
                  >
                    <td>
                      <strong>{evaluation.aluno_nome}</strong>
                      <small>{evaluation.cpf}</small>
                    </td>
                    <td>{evaluation.curso_nome}</td>
                    <td>{evaluation.instrutor_nome}</td>
                    <td>
                      {formatDate(evaluation.data_inicio)} a {formatDate(evaluation.data_fim)}
                    </td>
                    <td>{formatDate(evaluation.data_avaliacao)}</td>
                    <td>{formatNumber(evaluation.nota_geral, 2)}</td>
                    <td>{evaluation.teste_zoom}</td>
                    <td>{evaluation.comentario || '-'}</td>
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
