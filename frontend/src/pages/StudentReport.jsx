import { Download, FileSpreadsheet, FileText, Filter, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { downloadStudentsExcel, downloadStudentsPdf } from '../utils/studentReportExport.js';

const initialFilters = {
  search: '',
  createdFrom: '',
  createdTo: '',
  birthFrom: '',
  birthTo: '',
  responsavel: '',
  companyId: '',
  courseId: '',
  classStatus: '',
  hasClasses: '',
  minClasses: '',
  maxClasses: '',
  hasDocuments: '',
  hasNote: '',
  sexo: '',
  operacao: '',
  funcao: '',
  cidade: '',
  estado: ''
};

const sexOptions = ['Masculino', 'Feminino', 'Prefiro não dizer', 'Outro'];
const operations = ['Workover', 'Perfuração', 'Perfuração + Workover'];
const roles = ['Plataformista', 'Torrista', 'Sondador', 'Encarregado', 'Coordenador', 'Téc. operação', 'Operador', 'Engenheiro', 'Supervisor', 'Outro'];

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

export default function StudentReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [courses, setCourses] = useState([]);
  const [cities, setCities] = useState([]);
  const [studentStates, setStudentStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const metrics = useMemo(
    () => ({
      totalStudents: students.length,
      totalClasses: students.reduce((sum, student) => sum + numberValue(student.total_turmas), 0),
      withClasses: students.filter((student) => numberValue(student.total_turmas) > 0).length,
      withDocuments: students.filter((student) => numberValue(student.total_documentos) > 0).length
    }),
    [students]
  );

  const filtersSummary = useMemo(() => {
    const labels = [];
    if (activeFilters.search) labels.push(`Aluno: ${activeFilters.search}`);
    if (activeFilters.createdFrom) labels.push(`Cadastro desde ${formatDate(activeFilters.createdFrom)}`);
    if (activeFilters.createdTo) labels.push(`Cadastro ate ${formatDate(activeFilters.createdTo)}`);
    if (activeFilters.birthFrom) labels.push(`Nascimento desde ${formatDate(activeFilters.birthFrom)}`);
    if (activeFilters.birthTo) labels.push(`Nascimento ate ${formatDate(activeFilters.birthTo)}`);
    if (activeFilters.responsavel) labels.push(`Responsavel: ${activeFilters.responsavel}`);
    if (activeFilters.companyId) labels.push(`Empresa: ${companies.find((item) => String(item.id) === String(activeFilters.companyId))?.nome || activeFilters.companyId}`);
    if (activeFilters.courseId) labels.push(`Curso: ${courses.find((item) => String(item.id) === String(activeFilters.courseId))?.nome || activeFilters.courseId}`);
    if (activeFilters.classStatus) labels.push(`Status em turma: ${activeFilters.classStatus}`);
    if (activeFilters.hasClasses) labels.push(`Tem turmas: ${yesNoLabel(activeFilters.hasClasses)}`);
    if (activeFilters.minClasses) labels.push(`Min. turmas: ${activeFilters.minClasses}`);
    if (activeFilters.maxClasses) labels.push(`Max. turmas: ${activeFilters.maxClasses}`);
    if (activeFilters.hasDocuments) labels.push(`Tem documentos: ${yesNoLabel(activeFilters.hasDocuments)}`);
    if (activeFilters.hasNote) labels.push(`Tem observacao: ${yesNoLabel(activeFilters.hasNote)}`);
    if (activeFilters.sexo) labels.push(`Sexo: ${activeFilters.sexo}`);
    if (activeFilters.operacao) labels.push(`Operacao: ${activeFilters.operacao}`);
    if (activeFilters.funcao) labels.push(`Funcao: ${activeFilters.funcao}`);
    if (activeFilters.cidade) labels.push(`Cidade: ${activeFilters.cidade}`);
    if (activeFilters.estado) labels.push(`Estado: ${activeFilters.estado}`);

    return labels.join('; ') || 'Sem filtros';
  }, [activeFilters, companies, courses]);

  async function loadSupportData() {
    const [companyResponse, courseResponse, reportOptionsResponse] = await Promise.all([
      api.get('/companies'),
      api.get('/courses'),
      api.get('/students/report-options')
    ]);
    setCompanies(companyResponse.data);
    setCourses(courseResponse.data);
    setCities(reportOptionsResponse.data.cities || []);
    setStudentStates(reportOptionsResponse.data.states || []);
  }

  async function loadReport(nextFilters = filters) {
    setError('');
    setLoading(true);
    try {
      const params = cleanParams(nextFilters);
      const { data } = await api.get('/students/report', { params });
      setStudents(data);
      setActiveFilters(nextFilters);
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
        <h1>Relatorio de alunos</h1>
        <p>Filtre a base de alunos, revise os dados encontrados e exporte o resultado.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel report-filter-panel">
        <form className="filters report-filters" onSubmit={applyFilters}>
          <Field label="Buscar aluno" className="student-report-search-field">
            <div className="input-icon">
              <Search size={18} />
              <input value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Nome, CPF, email ou telefone do aluno" />
            </div>
          </Field>
          <Field label="Cadastro de">
            <input type="date" value={filters.createdFrom} onChange={(event) => update('createdFrom', event.target.value)} />
          </Field>
          <Field label="Cadastro ate">
            <input type="date" value={filters.createdTo} onChange={(event) => update('createdTo', event.target.value)} />
          </Field>
          <Field label="Nascimento de">
            <input type="date" value={filters.birthFrom} onChange={(event) => update('birthFrom', event.target.value)} />
          </Field>
          <Field label="Nascimento ate">
            <input type="date" value={filters.birthTo} onChange={(event) => update('birthTo', event.target.value)} />
          </Field>
          <Field label="Responsavel">
            <select value={filters.responsavel} onChange={(event) => update('responsavel', event.target.value)}>
              <option value="">Todos</option>
              <option value="Empresa">Empresa</option>
              <option value="Particular">Particular</option>
            </select>
          </Field>
          <Field label="Empresa">
            <select value={filters.companyId} onChange={(event) => update('companyId', event.target.value)}>
              <option value="">Todas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Curso participado">
            <select value={filters.courseId} onChange={(event) => update('courseId', event.target.value)}>
              <option value="">Todos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status em turma">
            <select value={filters.classStatus} onChange={(event) => update('classStatus', event.target.value)}>
              <option value="">Todos</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </Field>
          <Field label="Tem turmas">
            <select value={filters.hasClasses} onChange={(event) => update('hasClasses', event.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Sim</option>
              <option value="no">Nao</option>
            </select>
          </Field>
          <Field label="Min. turmas">
            <input type="number" min="0" value={filters.minClasses} onChange={(event) => update('minClasses', event.target.value)} />
          </Field>
          <Field label="Max. turmas">
            <input type="number" min="0" value={filters.maxClasses} onChange={(event) => update('maxClasses', event.target.value)} />
          </Field>
          <Field label="Tem documentos">
            <select value={filters.hasDocuments} onChange={(event) => update('hasDocuments', event.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Sim</option>
              <option value="no">Nao</option>
            </select>
          </Field>
          <Field label="Tem observacao">
            <select value={filters.hasNote} onChange={(event) => update('hasNote', event.target.value)}>
              <option value="">Todos</option>
              <option value="yes">Sim</option>
              <option value="no">Nao</option>
            </select>
          </Field>
          <Field label="Sexo">
            <select value={filters.sexo} onChange={(event) => update('sexo', event.target.value)}>
              <option value="">Todos</option>
              {sexOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Operacao">
            <select value={filters.operacao} onChange={(event) => update('operacao', event.target.value)}>
              <option value="">Todas</option>
              {operations.map((operation) => (
                <option key={operation} value={operation}>
                  {operation}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Funcao">
            <select value={filters.funcao} onChange={(event) => update('funcao', event.target.value)}>
              <option value="">Todas</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cidade">
            <select value={filters.cidade} onChange={(event) => update('cidade', event.target.value)}>
              <option value="">Todas</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select value={filters.estado} onChange={(event) => update('estado', event.target.value)}>
              <option value="">Todos</option>
              {studentStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
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
          <span>Alunos no relatorio</span>
          <strong>{metrics.totalStudents}</strong>
        </article>
        <article className="metric">
          <span>Soma de participacoes</span>
          <strong>{metrics.totalClasses}</strong>
        </article>
        <article className="metric">
          <span>Com turmas</span>
          <strong>{metrics.withClasses}</strong>
        </article>
        <article className="metric">
          <span>Com documentos</span>
          <strong>{metrics.withDocuments}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Resultado</h2>
            <small>{filtersSummary}</small>
          </div>
          <div className="inline-actions">
            <button className="ghost-button" type="button" onClick={() => downloadStudentsPdf(students, filtersSummary)} disabled={!students.length}>
              <FileText size={16} />
              PDF
            </button>
            <button className="ghost-button" type="button" onClick={() => downloadStudentsExcel(students)} disabled={!students.length}>
              <FileSpreadsheet size={16} />
              Excel
            </button>
            <button className="ghost-button" type="button" onClick={() => loadReport(activeFilters)} disabled={loading}>
              <Download size={16} />
              Atualizar
            </button>
          </div>
        </div>

        {students.length ? (
          <div className="table-wrap report-preview-table">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>CPF</th>
                  <th>Contato</th>
                  <th>Empresa</th>
                  <th>Operacao</th>
                  <th>Funcao</th>
                  <th>Turmas</th>
                  <th>Concluidas</th>
                  <th>Documentos</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/alunos/${student.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/admin/alunos/${student.id}`);
                      }
                    }}
                  >
                    <td>{student.nome_completo}</td>
                    <td>{student.cpf}</td>
                    <td>
                      <strong>{student.email}</strong>
                      <small>{student.telefone}</small>
                    </td>
                    <td>{student.empresa || '-'}</td>
                    <td>{student.operacao || '-'}</td>
                    <td>{student.funcao_descricao || student.funcao || '-'}</td>
                    <td>{student.total_turmas || 0}</td>
                    <td>{student.turmas_concluidas || 0}</td>
                    <td>{student.total_documentos || 0}</td>
                    <td>{formatDate(student.data_cadastro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhum aluno encontrado" description="Ajuste os filtros para ampliar o resultado." />
        )}
      </section>
    </div>
  );
}
