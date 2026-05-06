import { CheckCircle2, Download, Edit3, RotateCcw, Save, Search, Send, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { isDoneStatus } from '../utils/display.js';
import { downloadClassReport } from '../utils/pdfReport.js';

const initialCourseForm = { nome: '', classificacao_id: '', descricao: '' };
const initialClassificationForm = { nome: '', descricao: '' };
const initialLocationForm = { nome: '' };
const initialOnlineRoomForm = { nome: '' };
const initialClassForm = {
  curso_id: '',
  data_inicio: '',
  data_fim: '',
  instrutor_id: '',
  local: '',
  sala_online: '',
  observacao: '',
  status: 'Em andamento',
  student_ids: []
};

const tabs = [
  { id: 'classes', label: 'Turmas' },
  { id: 'courses', label: 'Cursos' },
  { id: 'classifications', label: 'Classificações' },
  { id: 'locations', label: 'Locais físicos' },
  { id: 'onlineRooms', label: 'Salas online' }
];

function handleRowKeyDown(event, action) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

export default function CoursesClasses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('classes');
  const [courses, setCourses] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [onlineRooms, setOnlineRooms] = useState([]);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [classificationForm, setClassificationForm] = useState(initialClassificationForm);
  const [locationForm, setLocationForm] = useState(initialLocationForm);
  const [onlineRoomForm, setOnlineRoomForm] = useState(initialOnlineRoomForm);
  const [classForm, setClassForm] = useState(initialClassForm);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingClassification, setEditingClassification] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingOnlineRoom, setEditingOnlineRoom] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [currentClassStudents, setCurrentClassStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingClassification, setSavingClassification] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingOnlineRoom, setSavingOnlineRoom] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [copiedEvaluationClassId, setCopiedEvaluationClassId] = useState(null);
  const [copiedEvaluationStudentKey, setCopiedEvaluationStudentKey] = useState('');
  const [reportClassId, setReportClassId] = useState(null);
  const [error, setError] = useState('');
  const evaluationLinkTimeout = useRef(null);

  async function loadAll() {
    const [courseResponse, classificationResponse, classResponse, studentResponse, instructorResponse, locationResponse, onlineRoomResponse] = await Promise.all([
      api.get('/courses'),
      api.get('/course-classifications'),
      api.get('/classes'),
      api.get('/students'),
      api.get('/instructors'),
      api.get('/locations'),
      api.get('/online-rooms')
    ]);

    setCourses(courseResponse.data);
    setClassifications(classificationResponse.data);
    setClasses(classResponse.data);
    setStudents(studentResponse.data);
    setInstructors(instructorResponse.data);
    setLocations(locationResponse.data);
    setOnlineRooms(onlineRoomResponse.data);
  }

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return students;

    return students.filter((student) =>
      [student.nome_completo, student.cpf, student.email, student.empresa]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [studentSearch, students]);

  useEffect(() => {
    loadAll().catch((err) => setError(getApiError(err)));

    return () => {
      if (evaluationLinkTimeout.current) {
        clearTimeout(evaluationLinkTimeout.current);
      }
    };
  }, []);

  async function saveCourse(event) {
    event.preventDefault();
    setError('');
    setSavingCourse(true);

    try {
      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, courseForm);
      } else {
        await api.post('/courses', courseForm);
      }
      setCourseForm(initialCourseForm);
      setEditingCourse(null);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingCourse(false);
    }
  }

  async function saveClassification(event) {
    event.preventDefault();
    setError('');
    setSavingClassification(true);

    try {
      if (editingClassification) {
        await api.put(`/course-classifications/${editingClassification.id}`, classificationForm);
      } else {
        await api.post('/course-classifications', classificationForm);
      }
      setClassificationForm(initialClassificationForm);
      setEditingClassification(null);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingClassification(false);
    }
  }

  async function saveLocation(event) {
    event.preventDefault();
    setError('');
    setSavingLocation(true);

    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, locationForm);
      } else {
        await api.post('/locations', locationForm);
      }
      setLocationForm(initialLocationForm);
      setEditingLocation(null);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveOnlineRoom(event) {
    event.preventDefault();
    setError('');
    setSavingOnlineRoom(true);

    try {
      if (editingOnlineRoom) {
        await api.put(`/online-rooms/${editingOnlineRoom.id}`, onlineRoomForm);
      } else {
        await api.post('/online-rooms', onlineRoomForm);
      }
      setOnlineRoomForm(initialOnlineRoomForm);
      setEditingOnlineRoom(null);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingOnlineRoom(false);
    }
  }

  async function saveClass(event) {
    event.preventDefault();
    setError('');
    setSavingClass(true);

    const payload = {
      ...classForm,
      curso_id: Number(classForm.curso_id),
      instrutor_id: Number(classForm.instrutor_id),
      student_ids: classForm.student_ids.map(Number)
    };

    try {
      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, payload);
      } else {
        await api.post('/classes', payload);
      }
      setClassForm(initialClassForm);
      setEditingClass(null);
      setCurrentClassStudents([]);
      setStudentSearch('');
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingClass(false);
    }
  }

  async function removeCourse(id) {
    if (!confirm('Excluir curso e suas turmas vinculadas?')) return;
    try {
      await api.delete(`/courses/${id}`);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function removeClassification(id) {
    if (!confirm('Excluir classificação?')) return;
    try {
      await api.delete(`/course-classifications/${id}`);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function removeLocation(id) {
    if (!confirm('Excluir local?')) return;
    try {
      await api.delete(`/locations/${id}`);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function removeOnlineRoom(id) {
    if (!confirm('Excluir sala online?')) return;
    try {
      await api.delete(`/online-rooms/${id}`);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function removeClass(id) {
    if (!confirm('Excluir turma?')) return;
    try {
      await api.delete(`/classes/${id}`);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function completeClass(id) {
    try {
      await api.patch(`/classes/${id}/complete`);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function reopenClass(id) {
    if (!confirm('Reabrir esta turma e voltar todos os alunos para Em andamento?')) return;

    try {
      await api.patch(`/classes/${id}/reopen`);
      if (editingClass?.id === id) {
        const { data } = await api.get(`/classes/${id}`);
        setEditingClass(data);
        setCurrentClassStudents(data.alunos);
        setClassForm((current) => ({ ...current, status: data.status, student_ids: data.alunos.map((student) => String(student.id)) }));
      }
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function copyEvaluationLink(turmaId) {
    const link = `${window.location.origin}/avaliacao/${turmaId}`;

    if (evaluationLinkTimeout.current) {
      clearTimeout(evaluationLinkTimeout.current);
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiedEvaluationClassId(turmaId);
      evaluationLinkTimeout.current = setTimeout(() => {
        setCopiedEvaluationClassId(null);
        evaluationLinkTimeout.current = null;
      }, 2400);
    } catch {
      setError('Não foi possível copiar o link de avaliação.');
    }
  }

  async function copyStudentEvaluationLink(turmaId, studentId) {
    const link = `${window.location.origin}/avaliacao/${turmaId}`;
    const key = `${turmaId}-${studentId}`;

    if (evaluationLinkTimeout.current) {
      clearTimeout(evaluationLinkTimeout.current);
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiedEvaluationStudentKey(key);
      evaluationLinkTimeout.current = setTimeout(() => {
        setCopiedEvaluationStudentKey('');
        evaluationLinkTimeout.current = null;
      }, 2400);
    } catch {
      setError('Não foi possível copiar o link de avaliação.');
    }
  }

  async function generateClassReport(turmaId) {
    setError('');
    setReportClassId(turmaId);
    try {
      const { data } = await api.get(`/classes/${turmaId}`);
      downloadClassReport(data);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setReportClassId(null);
    }
  }

  async function completeStudent(studentId) {
    if (!editingClass) return;
    try {
      await api.patch(`/classes/${editingClass.id}/students/${studentId}/complete`);
      const { data } = await api.get(`/classes/${editingClass.id}`);
      setCurrentClassStudents(data.alunos);
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function reopenStudent(studentId) {
    if (!editingClass) return;
    try {
      await api.patch(`/classes/${editingClass.id}/students/${studentId}/reopen`);
      const { data } = await api.get(`/classes/${editingClass.id}`);
      setEditingClass(data);
      setCurrentClassStudents(data.alunos);
      setClassForm((current) => ({ ...current, status: data.status, student_ids: data.alunos.map((student) => String(student.id)) }));
      await loadAll();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  function editCourse(course) {
    setActiveTab('courses');
    setEditingCourse(course);
    setCourseForm({ nome: course.nome, classificacao_id: String(course.classificacao_id || ''), descricao: course.descricao });
  }

  function editClassification(classification) {
    setActiveTab('classifications');
    setEditingClassification(classification);
    setClassificationForm({ nome: classification.nome, descricao: classification.descricao || '' });
  }

  function editLocation(location) {
    setActiveTab('locations');
    setEditingLocation(location);
    setLocationForm({ nome: location.nome });
  }

  function editOnlineRoom(room) {
    setActiveTab('onlineRooms');
    setEditingOnlineRoom(room);
    setOnlineRoomForm({ nome: room.nome });
  }

  async function editClass(turma) {
    setActiveTab('classes');
    const { data } = await api.get(`/classes/${turma.id}`);
    setEditingClass(data);
    setCurrentClassStudents(data.alunos);
    setStudentSearch('');
    setClassForm({
      curso_id: String(data.curso_id),
      data_inicio: data.data_inicio,
      data_fim: data.data_fim,
      instrutor_id: String(data.instrutor_id),
      local: data.local || '',
      sala_online: data.sala_online || '',
      observacao: data.observacao || '',
      status: data.status,
      student_ids: data.alunos.map((student) => String(student.id))
    });
  }

  function toggleStudent(studentId) {
    const id = String(studentId);
    setClassForm((current) => {
      const exists = current.student_ids.includes(id);
      return {
        ...current,
        student_ids: exists ? current.student_ids.filter((item) => item !== id) : [...current.student_ids, id]
      };
    });
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Operação acadêmica</span>
        <h1>Cursos e turmas</h1>
        <p>Gerencie cursos semanais, classificações, locais físicos, salas online e alunos inscritos.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="tab-list" role="tablist" aria-label="Gerenciamento acadêmico">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'courses' ? (
      <section className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h2>{editingCourse ? 'Editar curso' : 'Novo curso'}</h2>
          </div>
          <form className="stack" onSubmit={saveCourse}>
            <Field label="Nome">
              <input value={courseForm.nome} onChange={(event) => setCourseForm((current) => ({ ...current, nome: event.target.value }))} required />
            </Field>
            <Field label="Classificação">
              <select
                value={courseForm.classificacao_id}
                onChange={(event) => setCourseForm((current) => ({ ...current, classificacao_id: event.target.value }))}
                required
              >
                <option value="">{classifications.length ? 'Selecione' : 'Cadastre uma classificação'}</option>
                {classifications.map((classification) => (
                  <option key={classification.id} value={classification.id}>
                    {classification.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descrição">
              <textarea value={courseForm.descricao} onChange={(event) => setCourseForm((current) => ({ ...current, descricao: event.target.value }))} required />
            </Field>
            <div className="inline-actions">
              <button className="primary-button" type="submit" disabled={savingCourse}>
                <Save size={18} />
                {savingCourse ? (editingCourse ? 'Salvando...' : 'Cadastrando...') : editingCourse ? 'Salvar curso' : 'Cadastrar curso'}
              </button>
              {editingCourse ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingCourse(null);
                    setCourseForm(initialCourseForm);
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Cursos cadastrados</h2>
          </div>
          {courses.length ? (
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Classificação</th>
                    <th>Turmas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <strong>{course.nome}</strong>
                        <small>{course.descricao}</small>
                      </td>
                      <td>{course.classificacao_nome || '-'}</td>
                      <td>{course.total_turmas || 0}</td>
                      <td className="table-actions">
                        <button className="icon-button" type="button" onClick={() => editCourse(course)} aria-label="Editar curso">
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => removeCourse(course.id)} aria-label="Excluir curso">
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhum curso" description="Cadastre um curso antes de criar turmas." />
          )}
        </article>
      </section>
      ) : null}

      {activeTab === 'classifications' ? (
      <section className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h2>{editingClassification ? 'Editar classificação' : 'Nova classificação'}</h2>
          </div>
          <form className="stack" onSubmit={saveClassification}>
            <Field label="Nome">
              <input value={classificationForm.nome} onChange={(event) => setClassificationForm((current) => ({ ...current, nome: event.target.value }))} required />
            </Field>
            <Field label="Descrição">
              <textarea value={classificationForm.descricao} onChange={(event) => setClassificationForm((current) => ({ ...current, descricao: event.target.value }))} />
            </Field>
            <div className="inline-actions">
              <button className="primary-button" type="submit" disabled={savingClassification}>
                <Save size={18} />
                {savingClassification
                  ? editingClassification
                    ? 'Salvando...'
                    : 'Cadastrando...'
                  : editingClassification
                    ? 'Salvar classificação'
                    : 'Cadastrar classificação'}
              </button>
              {editingClassification ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingClassification(null);
                    setClassificationForm(initialClassificationForm);
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Classificações cadastradas</h2>
          </div>
          {classifications.length ? (
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Classificação</th>
                    <th>Cursos</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {classifications.map((classification) => (
                    <tr key={classification.id}>
                      <td>
                        <strong>{classification.nome}</strong>
                        {classification.descricao ? <small>{classification.descricao}</small> : null}
                      </td>
                      <td>{classification.total_cursos || 0}</td>
                      <td className="table-actions">
                        <button className="icon-button" type="button" onClick={() => editClassification(classification)} aria-label="Editar classificação">
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => removeClassification(classification.id)} aria-label="Excluir classificação">
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhuma classificação" description="Cadastre uma classificação antes de criar cursos." />
          )}
        </article>
      </section>
      ) : null}

      {activeTab === 'locations' ? (
      <section className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h2>{editingLocation ? 'Editar local físico' : 'Novo local físico'}</h2>
          </div>
          <form className="stack" onSubmit={saveLocation}>
            <Field label="Nome do local físico">
              <input value={locationForm.nome} onChange={(event) => setLocationForm({ nome: event.target.value })} required />
            </Field>
            <div className="inline-actions">
              <button className="primary-button" type="submit" disabled={savingLocation}>
                <Save size={18} />
                {savingLocation ? (editingLocation ? 'Salvando...' : 'Cadastrando...') : editingLocation ? 'Salvar local físico' : 'Cadastrar local físico'}
              </button>
              {editingLocation ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingLocation(null);
                    setLocationForm(initialLocationForm);
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Locais físicos cadastrados</h2>
          </div>
          {locations.length ? (
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Local físico</th>
                    <th>Turmas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td>
                        <strong>{location.nome}</strong>
                      </td>
                      <td>{location.total_turmas || 0}</td>
                      <td className="table-actions">
                        <button className="icon-button" type="button" onClick={() => editLocation(location)} aria-label="Editar local">
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => removeLocation(location.id)} aria-label="Excluir local">
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhum local físico" description="Cadastre locais físicos para selecionar ao criar turmas." />
          )}
        </article>
      </section>
      ) : null}

      {activeTab === 'onlineRooms' ? (
      <section className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h2>{editingOnlineRoom ? 'Editar sala online' : 'Nova sala online'}</h2>
          </div>
          <form className="stack" onSubmit={saveOnlineRoom}>
            <Field label="Nome da sala online">
              <input value={onlineRoomForm.nome} onChange={(event) => setOnlineRoomForm({ nome: event.target.value })} required />
            </Field>
            <div className="inline-actions">
              <button className="primary-button" type="submit" disabled={savingOnlineRoom}>
                <Save size={18} />
                {savingOnlineRoom ? (editingOnlineRoom ? 'Salvando...' : 'Cadastrando...') : editingOnlineRoom ? 'Salvar sala online' : 'Cadastrar sala online'}
              </button>
              {editingOnlineRoom ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingOnlineRoom(null);
                    setOnlineRoomForm(initialOnlineRoomForm);
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Salas online cadastradas</h2>
          </div>
          {onlineRooms.length ? (
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Sala online</th>
                    <th>Turmas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {onlineRooms.map((room) => (
                    <tr key={room.id}>
                      <td>
                        <strong>{room.nome}</strong>
                      </td>
                      <td>{room.total_turmas || 0}</td>
                      <td className="table-actions">
                        <button className="icon-button" type="button" onClick={() => editOnlineRoom(room)} aria-label="Editar sala online">
                          <Edit3 size={17} />
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => removeOnlineRoom(room.id)} aria-label="Excluir sala online">
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhuma sala online" description="Cadastre salas online para selecionar ao criar turmas." />
          )}
        </article>
      </section>
      ) : null}

      {activeTab === 'classes' ? (
      <>
      <section className="panel">
        <div className="panel-heading">
          <h2>{editingClass ? 'Editar turma' : 'Nova turma'}</h2>
        </div>
        <form className="form-grid" onSubmit={saveClass}>
          <Field label="Curso vinculado">
            <select value={classForm.curso_id} onChange={(event) => setClassForm((current) => ({ ...current, curso_id: event.target.value }))} required>
              <option value="">Selecione</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.classificacao_nome ? `${course.nome} - ${course.classificacao_nome}` : course.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instrutor">
            <select value={classForm.instrutor_id} onChange={(event) => setClassForm((current) => ({ ...current, instrutor_id: event.target.value }))} required>
              <option value="">Selecione</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data início">
            <input type="date" value={classForm.data_inicio} onChange={(event) => setClassForm((current) => ({ ...current, data_inicio: event.target.value }))} required />
          </Field>
          <Field label="Data fim">
            <input type="date" value={classForm.data_fim} onChange={(event) => setClassForm((current) => ({ ...current, data_fim: event.target.value }))} required />
          </Field>
          <Field label="Local físico">
            <select value={classForm.local} onChange={(event) => setClassForm((current) => ({ ...current, local: event.target.value }))} required>
              <option value="">{locations.length ? 'Selecione' : 'Cadastre um local'}</option>
              {classForm.local && !locations.some((location) => location.nome === classForm.local) ? <option value={classForm.local}>{classForm.local}</option> : null}
              {locations.map((location) => (
                <option key={location.id} value={location.nome}>
                  {location.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sala online">
            <select value={classForm.sala_online} onChange={(event) => setClassForm((current) => ({ ...current, sala_online: event.target.value }))} required>
              <option value="">{onlineRooms.length ? 'Selecione' : 'Cadastre uma sala online'}</option>
              {classForm.sala_online && !onlineRooms.some((room) => room.nome === classForm.sala_online) ? <option value={classForm.sala_online}>{classForm.sala_online}</option> : null}
              {onlineRooms.map((room) => (
                <option key={room.id} value={room.nome}>
                  {room.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={classForm.status} onChange={(event) => setClassForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </Field>
          <Field label="Observação">
            <textarea value={classForm.observacao} onChange={(event) => setClassForm((current) => ({ ...current, observacao: event.target.value }))} />
          </Field>

          <div className="student-picker form-wide">
            <div className="panel-heading inline">
              <h3>Alunos da turma</h3>
              <span>{classForm.student_ids.length} selecionados</span>
            </div>
            {students.length ? (
              <>
                <Field label="Pesquisar aluno">
                  <div className="input-icon">
                    <Search size={18} />
                    <input placeholder="Nome, CPF, email ou empresa" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
                  </div>
                </Field>
                {filteredStudents.length ? (
                  <div className="checkbox-grid">
                    {filteredStudents.map((student) => (
                      <label key={student.id} className="check-row">
                        <input type="checkbox" checked={classForm.student_ids.includes(String(student.id))} onChange={() => toggleStudent(student.id)} />
                        <span>
                          <strong>{student.nome_completo}</strong>
                          <small>{student.cpf} - cadastrado em {formatDate(student.criado_em?.slice(0, 10))}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Nenhum aluno encontrado" description="Revise o termo pesquisado." />
                )}
              </>
            ) : (
              <EmptyState title="Sem alunos cadastrados" description="Alunos aparecem aqui após o cadastro público." />
            )}
          </div>

          {editingClass && currentClassStudents.length ? (
            <div className="form-wide table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClassStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="clickable-row"
                      tabIndex={0}
                      onClick={() => navigate(`/admin/alunos/${student.id}`)}
                      onKeyDown={(event) => handleRowKeyDown(event, () => navigate(`/admin/alunos/${student.id}`))}
                    >
                      <td>{student.nome_completo}</td>
                      <td>
                        <span className={`status-badge ${isDoneStatus(student.status_turma) ? 'done' : 'active'}`}>{student.status_turma}</span>
                      </td>
                      <td>
                        {!isDoneStatus(student.status_turma) ? (
                          <button
                            className="small-button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              completeStudent(student.id);
                            }}
                          >
                            <CheckCircle2 size={15} />
                            Concluir aluno
                          </button>
                        ) : (
                          <div className="inline-actions compact-actions">
                            <button
                              className={`small-button ${copiedEvaluationStudentKey === `${editingClass.id}-${student.id}` ? 'success' : ''}`}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                copyStudentEvaluationLink(editingClass.id, student.id);
                              }}
                            >
                              {copiedEvaluationStudentKey === `${editingClass.id}-${student.id}` ? <CheckCircle2 size={15} /> : <Send size={15} />}
                              {copiedEvaluationStudentKey === `${editingClass.id}-${student.id}` ? 'Link copiado' : 'Enviar avaliação'}
                            </button>
                            <button
                              className="small-button"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                reopenStudent(student.id);
                              }}
                            >
                              <RotateCcw size={15} />
                              Reabrir aluno
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="form-actions form-wide">
            <button className="primary-button" type="submit" disabled={savingClass}>
              <Save size={18} />
              {savingClass ? (editingClass ? 'Salvando...' : 'Cadastrando...') : editingClass ? 'Salvar turma' : 'Cadastrar turma'}
            </button>
            {editingClass ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setEditingClass(null);
                  setCurrentClassStudents([]);
                  setClassForm(initialClassForm);
                  setStudentSearch('');
                }}
              >
                <X size={16} />
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Turmas cadastradas</h2>
        </div>
        {classes.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Instrutor</th>
                  <th>Período</th>
                  <th>Salas</th>
                  <th>Alunos</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((turma) => (
                  <tr
                    key={turma.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/turmas/${turma.id}`)}
                    onKeyDown={(event) => handleRowKeyDown(event, () => navigate(`/admin/turmas/${turma.id}`))}
                  >
                    <td>{turma.curso_nome}</td>
                    <td>{turma.instrutor_nome}</td>
                    <td>
                      {formatDate(turma.data_inicio)} a {formatDate(turma.data_fim)}
                    </td>
                    <td>
                      <strong>{turma.local || '-'}</strong>
                      {turma.sala_online ? <small>Sala online: {turma.sala_online}</small> : null}
                    </td>
                    <td>{turma.total_alunos || 0}</td>
                    <td>
                      <span className={`status-badge ${isDoneStatus(turma.status) ? 'done' : 'active'}`}>{turma.status}</span>
                    </td>
                    <td className="table-actions">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          generateClassReport(turma.id);
                        }}
                        disabled={reportClassId === turma.id}
                        aria-label="Gerar relatorio da turma em PDF"
                      >
                        <Download size={17} />
                      </button>
                      {!isDoneStatus(turma.status) ? (
                        <button
                          className="icon-button success"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            completeClass(turma.id);
                          }}
                          aria-label="Concluir turma"
                        >
                          <CheckCircle2 size={17} />
                        </button>
                      ) : (
                        <button
                          className={`small-button ${copiedEvaluationClassId === turma.id ? 'success' : ''}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            copyEvaluationLink(turma.id);
                          }}
                          title={`${window.location.origin}/avaliacao/${turma.id}`}
                        >
                          {copiedEvaluationClassId === turma.id ? <CheckCircle2 size={15} /> : <Send size={15} />}
                          {copiedEvaluationClassId === turma.id ? 'Link copiado' : 'Enviar avaliação'}
                        </button>
                      )}
                      {isDoneStatus(turma.status) ? (
                        <button
                          className="icon-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            reopenClass(turma.id);
                          }}
                          aria-label="Reabrir turma"
                        >
                          <RotateCcw size={17} />
                        </button>
                      ) : null}
                      <button
                        className="icon-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          editClass(turma);
                        }}
                        aria-label="Editar turma"
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeClass(turma.id);
                        }}
                        aria-label="Excluir turma"
                      >
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma turma" description="Crie uma turma vinculando curso, instrutor e alunos." />
        )}
      </section>
      </>
      ) : null}
    </div>
  );
}
