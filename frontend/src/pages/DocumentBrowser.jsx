import { ExternalLink, FileSearch, FileText, Folder, FolderOpen, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { formatFileSize } from '../utils/display.js';

const emptyData = {
  years: [],
  months: [],
  classes: [],
  students: [],
  documents: []
};

function documentCountLabel(total) {
  const count = Number(total || 0);
  return `${count} ${count === 1 ? 'documento' : 'documentos'}`;
}

function classLabel(turma) {
  if (!turma) return '';
  return `${turma.curso_nome} - ${formatDate(turma.data_inicio)} a ${formatDate(turma.data_fim)}`;
}

function BrowserItem({ active, icon: Icon, title, meta, detail, onClick }) {
  return (
    <button className={`browser-item ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      <Icon size={20} />
      <span>
        <strong>{title}</strong>
        {meta ? <small>{meta}</small> : null}
        {detail ? <em>{detail}</em> : null}
      </span>
    </button>
  );
}

function StudentBrowserItem({ active, student, detail, onSelect, onOpenProfile }) {
  function handleKeyDown(event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <div className={`browser-item ${active ? 'active' : ''}`} role="button" tabIndex={0} onClick={onSelect} onKeyDown={handleKeyDown}>
      <Users size={20} />
      <span>
        <button
          className="browser-item-name-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile();
          }}
        >
          {student.nome_completo}
        </button>
        {student.email || student.cpf ? <small>{student.email || student.cpf}</small> : null}
        <em>{detail}</em>
      </span>
    </div>
  );
}

export default function DocumentBrowser() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState({
    year: '',
    month: '',
    classId: '',
    studentId: ''
  });
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    api
      .get('/students/document-browser')
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch((err) => {
        if (active) setError(getApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredMonths = useMemo(
    () => data.months.filter((item) => String(item.year) === String(selection.year)),
    [data.months, selection.year]
  );
  const selectedMonth = useMemo(
    () => filteredMonths.find((item) => String(item.month) === String(selection.month)),
    [filteredMonths, selection.month]
  );
  const filteredClasses = useMemo(
    () =>
      data.classes.filter(
        (item) =>
          String(item.ano) === String(selection.year) &&
          String(item.mes) === String(selection.month)
      ),
    [data.classes, selection.year, selection.month]
  );
  const selectedClass = useMemo(() => data.classes.find((item) => String(item.id) === String(selection.classId)), [data.classes, selection.classId]);
  const filteredStudents = useMemo(
    () => data.students.filter((item) => String(item.turma_id) === String(selection.classId)),
    [data.students, selection.classId]
  );
  const selectedStudent = useMemo(
    () => filteredStudents.find((item) => String(item.id) === String(selection.studentId)),
    [filteredStudents, selection.studentId]
  );
  const filteredDocuments = useMemo(
    () =>
      data.documents.filter(
        (item) =>
          String(item.turma_id) === String(selection.classId) &&
          String(item.aluno_id) === String(selection.studentId)
      ),
    [data.documents, selection.classId, selection.studentId]
  );

  function selectYear(year) {
    setSelection({ year: String(year), month: '', classId: '', studentId: '' });
  }

  function selectMonth(month) {
    setSelection((current) => ({ ...current, month: String(month), classId: '', studentId: '' }));
  }

  function selectClass(classId) {
    setSelection((current) => ({ ...current, classId: String(classId), studentId: '' }));
  }

  function selectStudent(studentId) {
    setSelection((current) => ({ ...current, studentId: String(studentId) }));
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Documentos</span>
        <h1>Consultar documentos</h1>
        <p>Navegue por ano, mês, turma e funcionário para encontrar os arquivos vinculados.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel document-browser-panel">
        <div className="document-browser-toolbar">
          <div className="document-breadcrumb">
            <button type="button" onClick={() => setSelection({ year: '', month: '', classId: '', studentId: '' })}>
              Início
            </button>
            {selection.year ? <button type="button" onClick={() => selectYear(selection.year)}>{selection.year}</button> : null}
            {selection.month ? <button type="button" onClick={() => selectMonth(selection.month)}>{selectedMonth?.label || selection.month}</button> : null}
            {selection.classId ? <button type="button" onClick={() => selectClass(selection.classId)}>{selectedClass?.curso_nome || 'Turma'}</button> : null}
            {selection.studentId ? <span>{selectedStudent?.nome_completo || 'Funcionário'}</span> : null}
          </div>
          {loading ? <div className="loading-chip">Atualizando...</div> : null}
        </div>

        <div className="document-browser-grid">
          <div className="browser-column">
            <div className="browser-column-heading">
              <Folder size={18} />
              <strong>Anos</strong>
            </div>
            {data.years.length ? (
              <div className="browser-list">
                {data.years.map((year) => (
                  <BrowserItem
                    key={year.year}
                    active={String(selection.year) === String(year.year)}
                    icon={String(selection.year) === String(year.year) ? FolderOpen : Folder}
                    title={year.year}
                    meta={`${year.total_turmas} turma(s)`}
                    detail={documentCountLabel(year.total_documentos)}
                    onClick={() => selectYear(year.year)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Sem anos" description="Cadastre turmas para iniciar a consulta." />
            )}
          </div>

          <div className="browser-column">
            <div className="browser-column-heading">
              <Folder size={18} />
              <strong>Meses</strong>
            </div>
            {selection.year ? (
              filteredMonths.length ? (
                <div className="browser-list">
                  {filteredMonths.map((month) => (
                    <BrowserItem
                      key={`${month.year}-${month.month}`}
                      active={String(selection.month) === String(month.month)}
                      icon={String(selection.month) === String(month.month) ? FolderOpen : Folder}
                      title={month.label}
                      meta={`${month.total_turmas} turma(s)`}
                      detail={documentCountLabel(month.total_documentos)}
                      onClick={() => selectMonth(month.month)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem meses" description="Nenhuma turma encontrada para este ano." />
              )
            ) : (
              <EmptyState title="Selecione um ano" description="Os meses aparecem depois da seleção." />
            )}
          </div>

          <div className="browser-column browser-column-wide">
            <div className="browser-column-heading">
              <Folder size={18} />
              <strong>Turmas</strong>
            </div>
            {selection.year && selection.month ? (
              filteredClasses.length ? (
                <div className="browser-list">
                  {filteredClasses.map((turma) => (
                    <BrowserItem
                      key={turma.id}
                      active={String(selection.classId) === String(turma.id)}
                      icon={String(selection.classId) === String(turma.id) ? FolderOpen : Folder}
                      title={classLabel(turma)}
                      meta={`${turma.total_alunos || 0} funcionário(s)`}
                      detail={`${documentCountLabel(turma.total_documentos)} na turma`}
                      onClick={() => selectClass(turma.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem turmas" description="Nenhuma turma encontrada neste mês." />
              )
            ) : (
              <EmptyState title="Selecione um mês" description="As turmas aparecem depois da seleção." />
            )}
          </div>

          <div className="browser-column browser-column-wide">
            <div className="browser-column-heading">
              <Users size={18} />
              <strong>Funcionários</strong>
            </div>
            {selection.classId ? (
              filteredStudents.length ? (
                <div className="browser-list">
                  {filteredStudents.map((student) => (
                    <StudentBrowserItem
                      key={`${student.turma_id}-${student.id}`}
                      active={String(selection.studentId) === String(student.id)}
                      student={student}
                      detail={`${documentCountLabel(student.total_documentos)} ligados ao aluno, ${documentCountLabel(student.total_documentos_turma)} nesta turma`}
                      onSelect={() => selectStudent(student.id)}
                      onOpenProfile={() => navigate(`/admin/alunos/${student.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem funcionários" description="Esta turma ainda não possui alunos vinculados." />
              )
            ) : (
              <EmptyState title="Selecione uma turma" description="Os funcionários aparecem depois da seleção." />
            )}
          </div>

          <div className="browser-column browser-column-wide">
            <div className="browser-column-heading">
              <FileSearch size={18} />
              <strong>Arquivos</strong>
            </div>
            {selection.studentId ? (
              filteredDocuments.length ? (
                <div className="browser-file-list">
                  {filteredDocuments.map((document) => (
                    <div key={document.id} className="browser-file-row">
                      <FileText size={20} />
                      <div>
                        <strong>{document.nome_arquivo}</strong>
                        <small>
                          {document.tipo_arquivo || 'Arquivo'} - {formatFileSize(document.tamanho_bytes)}
                        </small>
                      </div>
                      {document.drive_url ? (
                        <a className="icon-button" href={document.drive_url} target="_blank" rel="noreferrer" aria-label="Abrir documento">
                          <ExternalLink size={17} />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Sem arquivos nesta turma" description="Este funcionário possui a contagem ao lado, mas não há documento vinculado à turma selecionada." />
              )
            ) : (
              <EmptyState title="Selecione um funcionário" description="Os arquivos aparecem depois da seleção." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
