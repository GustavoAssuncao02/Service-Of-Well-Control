import { Download, FileSpreadsheet, FileText, Filter, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { downloadClassesExcel, downloadClassesPdf } from '../utils/classReportExport.js';
import { isDoneStatus } from '../utils/display.js';

const initialFilters = {
  startFrom: '',
  startTo: '',
  endFrom: '',
  endTo: '',
  createdFrom: '',
  createdTo: '',
  courseId: '',
  classificationId: '',
  instructorId: '',
  status: '',
  local: '',
  onlineRoom: '',
  minStudents: '',
  maxStudents: '',
  hasEvaluations: '',
  minResponseRate: '',
  maxResponseRate: ''
};

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

function formatNumber(value, decimals = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toFixed(decimals);
}

function formatPercent(value) {
  return `${formatNumber(value, 1)}%`;
}

export default function ClassReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [onlineRooms, setOnlineRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const metrics = useMemo(() => {
    const totalStudents = classes.reduce((sum, turma) => sum + numberValue(turma.total_alunos), 0);
    const completedStudents = classes.reduce((sum, turma) => sum + numberValue(turma.alunos_concluidos), 0);
    const receivedEvaluations = classes.reduce((sum, turma) => sum + numberValue(turma.avaliacoes_recebidas), 0);

    return {
      totalClasses: classes.length,
      totalStudents,
      receivedEvaluations,
      responseRate: completedStudents ? (receivedEvaluations * 100) / completedStudents : 0
    };
  }, [classes]);

  const filtersSummary = useMemo(() => {
    const labels = [];
    if (activeFilters.startFrom) labels.push(`Inicio desde ${formatDate(activeFilters.startFrom)}`);
    if (activeFilters.startTo) labels.push(`Inicio ate ${formatDate(activeFilters.startTo)}`);
    if (activeFilters.endFrom) labels.push(`Fim desde ${formatDate(activeFilters.endFrom)}`);
    if (activeFilters.endTo) labels.push(`Fim ate ${formatDate(activeFilters.endTo)}`);
    if (activeFilters.createdFrom) labels.push(`Cadastro desde ${formatDate(activeFilters.createdFrom)}`);
    if (activeFilters.createdTo) labels.push(`Cadastro ate ${formatDate(activeFilters.createdTo)}`);
    if (activeFilters.courseId) labels.push(`Curso: ${courses.find((item) => String(item.id) === String(activeFilters.courseId))?.nome || activeFilters.courseId}`);
    if (activeFilters.classificationId) {
      labels.push(`Classificacao: ${classifications.find((item) => String(item.id) === String(activeFilters.classificationId))?.nome || activeFilters.classificationId}`);
    }
    if (activeFilters.instructorId) labels.push(`Instrutor: ${instructors.find((item) => String(item.id) === String(activeFilters.instructorId))?.nome || activeFilters.instructorId}`);
    if (activeFilters.status) labels.push(`Status: ${activeFilters.status}`);
    if (activeFilters.local) labels.push(`Local: ${activeFilters.local}`);
    if (activeFilters.onlineRoom) labels.push(`Sala online: ${activeFilters.onlineRoom}`);
    if (activeFilters.minStudents) labels.push(`Min. alunos: ${activeFilters.minStudents}`);
    if (activeFilters.maxStudents) labels.push(`Max. alunos: ${activeFilters.maxStudents}`);
    if (activeFilters.hasEvaluations) labels.push(`Tem avaliacoes: ${yesNoLabel(activeFilters.hasEvaluations)}`);
    if (activeFilters.minResponseRate) labels.push(`Min. resposta: ${activeFilters.minResponseRate}%`);
    if (activeFilters.maxResponseRate) labels.push(`Max. resposta: ${activeFilters.maxResponseRate}%`);

    return labels.join('; ') || 'Sem filtros';
  }, [activeFilters, courses, classifications, instructors]);

  async function loadSupportData() {
    const [courseResponse, classificationResponse, instructorResponse, optionsResponse] = await Promise.all([
      api.get('/courses'),
      api.get('/course-classifications'),
      api.get('/instructors'),
      api.get('/classes/report-options')
    ]);

    setCourses(courseResponse.data);
    setClassifications(classificationResponse.data);
    setInstructors(instructorResponse.data);
    setStatuses(optionsResponse.data.statuses || []);
    setLocations(optionsResponse.data.locations || []);
    setOnlineRooms(optionsResponse.data.onlineRooms || []);
  }

  async function loadReport(nextFilters = filters) {
    setError('');
    setLoading(true);
    try {
      const params = cleanParams(nextFilters);
      const { data } = await api.get('/classes/report', { params });
      setClasses(data);
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
        <h1>Relatorio de turmas</h1>
        <p>Filtre as turmas, revise participacao e avaliacoes, e exporte o resultado.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel report-filter-panel">
        <form className="filters report-filters" onSubmit={applyFilters}>
          <Field label="Inicio de">
            <input type="date" value={filters.startFrom} onChange={(event) => update('startFrom', event.target.value)} />
          </Field>
          <Field label="Inicio ate">
            <input type="date" value={filters.startTo} onChange={(event) => update('startTo', event.target.value)} />
          </Field>
          <Field label="Fim de">
            <input type="date" value={filters.endFrom} onChange={(event) => update('endFrom', event.target.value)} />
          </Field>
          <Field label="Fim ate">
            <input type="date" value={filters.endTo} onChange={(event) => update('endTo', event.target.value)} />
          </Field>
          <Field label="Cadastro de">
            <input type="date" value={filters.createdFrom} onChange={(event) => update('createdFrom', event.target.value)} />
          </Field>
          <Field label="Cadastro ate">
            <input type="date" value={filters.createdTo} onChange={(event) => update('createdTo', event.target.value)} />
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
          <Field label="Classificacao">
            <select value={filters.classificationId} onChange={(event) => update('classificationId', event.target.value)}>
              <option value="">Todas</option>
              {classifications.map((classification) => (
                <option key={classification.id} value={classification.id}>
                  {classification.nome}
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
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Local">
            <select value={filters.local} onChange={(event) => update('local', event.target.value)}>
              <option value="">Todos</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sala online">
            <select value={filters.onlineRoom} onChange={(event) => update('onlineRoom', event.target.value)}>
              <option value="">Todas</option>
              {onlineRooms.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Min. alunos">
            <input type="number" min="0" value={filters.minStudents} onChange={(event) => update('minStudents', event.target.value)} />
          </Field>
          <Field label="Max. alunos">
            <input type="number" min="0" value={filters.maxStudents} onChange={(event) => update('maxStudents', event.target.value)} />
          </Field>
          <Field label="Tem avaliacoes">
            <select value={filters.hasEvaluations} onChange={(event) => update('hasEvaluations', event.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Sim</option>
              <option value="no">Nao</option>
            </select>
          </Field>
          <Field label="Min. resposta %">
            <input type="number" min="0" max="100" value={filters.minResponseRate} onChange={(event) => update('minResponseRate', event.target.value)} />
          </Field>
          <Field label="Max. resposta %">
            <input type="number" min="0" max="100" value={filters.maxResponseRate} onChange={(event) => update('maxResponseRate', event.target.value)} />
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
          <span>Turmas no relatorio</span>
          <strong>{metrics.totalClasses}</strong>
        </article>
        <article className="metric">
          <span>Soma de alunos</span>
          <strong>{metrics.totalStudents}</strong>
        </article>
        <article className="metric">
          <span>Avaliacoes recebidas</span>
          <strong>{metrics.receivedEvaluations}</strong>
        </article>
        <article className="metric">
          <span>Taxa de resposta</span>
          <strong>{formatPercent(metrics.responseRate)}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Resultado</h2>
            <small>{filtersSummary}</small>
          </div>
          <div className="inline-actions">
            <button className="ghost-button" type="button" onClick={() => downloadClassesPdf(classes, filtersSummary)} disabled={!classes.length}>
              <FileText size={16} />
              PDF
            </button>
            <button className="ghost-button" type="button" onClick={() => downloadClassesExcel(classes)} disabled={!classes.length}>
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button className="ghost-button" type="button" onClick={() => loadReport(activeFilters)} disabled={loading}>
              <Download size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {classes.length ? (
          <div className="table-wrap report-preview-table">
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Instrutor</th>
                  <th>Periodo</th>
                  <th>Local</th>
                  <th>Alunos</th>
                  <th>Avaliacoes</th>
                  <th>Resposta</th>
                  <th>Media</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((turma) => (
                  <tr
                    key={turma.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/turmas/${turma.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/admin/turmas/${turma.id}`);
                      }
                    }}
                  >
                    <td>
                      <strong>{turma.curso_nome}</strong>
                      <small>{turma.classificacao_nome}</small>
                    </td>
                    <td>{turma.instrutor_nome}</td>
                    <td>
                      {formatDate(turma.data_inicio)} a {formatDate(turma.data_fim)}
                    </td>
                    <td>
                      <strong>{turma.local || '-'}</strong>
                      {turma.sala_online ? <small>Sala online: {turma.sala_online}</small> : null}
                    </td>
                    <td>
                      <strong>{turma.total_alunos || 0}</strong>
                      <small>{turma.alunos_concluidos || 0} concluidos</small>
                    </td>
                    <td>
                      <strong>{turma.avaliacoes_recebidas || 0}</strong>
                      <small>{turma.avaliacoes_pendentes || 0} pendentes</small>
                    </td>
                    <td>{formatPercent(turma.taxa_resposta)}</td>
                    <td>{turma.media_geral === null ? '-' : formatNumber(turma.media_geral, 2)}</td>
                    <td>
                      <span className={`status-badge ${isDoneStatus(turma.status) ? 'done' : 'active'}`}>{turma.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma turma encontrada" description="Ajuste os filtros para ampliar o resultado." />
        )}
      </section>
    </div>
  );
}
