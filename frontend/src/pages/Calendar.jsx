import { CalendarDays, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { currentMonthIso, formatDate } from '../utils/date.js';
import { isDoneStatus, isVisiblePlace, studentCountLabel } from '../utils/display.js';
import { downloadDayClassesReport } from '../utils/pdfReport.js';

const eventPalette = [
  { bg: '#e8f3ff', color: '#1d4f8f', border: '#b9d8fb' },
  { bg: '#fff4db', color: '#8a5a08', border: '#f2d18c' },
  { bg: '#f1edff', color: '#5944a8', border: '#d4c8fb' },
  { bg: '#f4f6fb', color: '#475569', border: '#d8deea' },
  { bg: '#ffeef3', color: '#9a3f5c', border: '#f5c2d1' },
  { bg: '#fff0e7', color: '#9a4d16', border: '#f8c8a8' }
];

function paletteForCourse(turma) {
  const key = String(turma.curso_nome || turma.id || '');
  const index = [...key].reduce((total, character) => total + character.charCodeAt(0), 0) % eventPalette.length;
  return eventPalette[index];
}

function eventStyle(turma) {
  if (isDoneStatus(turma.status)) return undefined;
  const tone = paletteForCourse(turma);
  return {
    '--event-bg': tone.bg,
    '--event-color': tone.color,
    '--event-border': tone.border
  };
}

function parseIso(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toMonthIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month, amount) {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return currentMonthIso();
  return toMonthIso(new Date(year, monthNumber - 1 + amount, 1));
}

function studentIdsFromClass(turma) {
  return String(turma.aluno_ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function roomLabel(room) {
  const label = String(room || '').trim() || 'Sem sala';
  return label.toLowerCase().startsWith('sala') ? label : `Sala ${label}`;
}

function groupClassesByRoom(classes) {
  const groups = new Map();

  classes.forEach((turma) => {
    const room = String(turma.sala_online || '').trim() || 'Sem sala';
    const key = room.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        sala_online: room,
        locais: new Set(),
        cursos: new Set(),
        classes: [],
        studentIds: new Set(),
        totalFallback: 0
      });
    }

    const group = groups.get(key);
    const studentIds = studentIdsFromClass(turma);

    group.classes.push(turma);
    if (isVisiblePlace(turma.local)) group.locais.add(turma.local);
    if (turma.curso_nome) group.cursos.add(turma.curso_nome);

    if (studentIds.length) {
      studentIds.forEach((studentId) => group.studentIds.add(studentId));
    } else {
      group.totalFallback += Number(turma.total_alunos || 0);
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      key: group.key,
      sala_online: group.sala_online,
      locais: Array.from(group.locais),
      cursos: Array.from(group.cursos),
      classes: group.classes,
      total_alunos: group.studentIds.size || group.totalFallback,
      done: group.classes.length > 0 && group.classes.every((turma) => isDoneStatus(turma.status))
    }))
    .sort((first, second) => first.sala_online.localeCompare(second.sala_online, 'pt-BR', { numeric: true }));
}

function roomEventStyle(room) {
  if (room.done) return undefined;
  const tone = paletteForCourse({ id: room.key, curso_nome: room.sala_online });
  return {
    '--event-bg': tone.bg,
    '--event-color': tone.color,
    '--event-border': tone.border
  };
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const total = new Date(year, monthNumber, 0).getDate();
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const blanks = Array.from({ length: firstWeekday }, (_, index) => ({ blank: true, id: `blank-${index}` }));
  const days = Array.from({ length: total }, (_, index) => {
    const day = index + 1;
    return {
      day,
      iso: `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    };
  });

  return [...blanks, ...days];
}

export default function Calendar() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthIso());
  const [calendarView, setCalendarView] = useState('classes');
  const [selectedDayIso, setSelectedDayIso] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadCalendar(nextMonth = month) {
    const { data } = await api.get('/calendar', { params: { month: nextMonth } });
    setClasses(data.classes);
  }

  useEffect(() => {
    let active = true;

    setError('');
    setLoading(true);
    setSelectedDayIso('');

    loadCalendar(month)
      .catch((err) => {
        if (active) setError(getApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month]);

  const calendarDays = useMemo(() => {
    const map = new Map();

    classes.forEach((turma) => {
      const start = parseIso(turma.data_inicio);
      const end = parseIso(turma.data_fim);
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const iso = toIso(date);
        map.set(iso, [...(map.get(iso) || []), turma]);
      }
    });

    return daysInMonth(month).map((day) => {
      const dayClasses = day.iso ? map.get(day.iso) || [] : [];
      return {
        ...day,
        classes: dayClasses,
        rooms: groupClassesByRoom(dayClasses)
      };
    });
  }, [classes, month]);

  const selectedDay = useMemo(() => {
    if (!selectedDayIso) return null;
    return calendarDays.find((day) => day.iso === selectedDayIso) || null;
  }, [calendarDays, selectedDayIso]);

  async function generateDayReport() {
    if (!selectedDay) return;

    setError('');
    setReportLoading(true);
    try {
      const detailedClasses = await Promise.all(
        selectedDay.classes.map(async (turma) => {
          const { data } = await api.get(`/classes/${turma.id}`);
          return data;
        })
      );
      downloadDayClassesReport(selectedDay.iso, detailedClasses);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setReportLoading(false);
    }
  }

  const selectedDayStudentTotal = selectedDay
    ? calendarView === 'rooms'
      ? selectedDay.rooms.reduce((total, room) => total + Number(room.total_alunos || 0), 0)
      : selectedDay.classes.reduce((total, turma) => total + Number(turma.total_alunos || 0), 0)
    : 0;

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Agenda</span>
        <h1>Calendário</h1>
        <p>Visualize cursos por dia, com quantidade de alunos, local e sala virtual.</p>
      </div>

      <section className="panel">
        <div className="filters">
          <Field label="Mês">
            <div className="month-navigation">
              <button className="icon-button" type="button" onClick={() => setMonth((current) => shiftMonth(current, -1))} aria-label="Mês anterior">
                <ChevronLeft size={18} />
              </button>
              <input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
              <button className="icon-button" type="button" onClick={() => setMonth((current) => shiftMonth(current, 1))} aria-label="Próximo mês">
                <ChevronRight size={18} />
              </button>
            </div>
          </Field>
          <Field label="Visualização">
            <div className="tab-list calendar-view-toggle">
              <button className={`tab-button ${calendarView === 'classes' ? 'active' : ''}`} type="button" onClick={() => setCalendarView('classes')}>
                Por turma
              </button>
              <button className={`tab-button ${calendarView === 'rooms' ? 'active' : ''}`} type="button" onClick={() => setCalendarView('rooms')}>
                Por sala
              </button>
            </div>
          </Field>
          {loading ? <div className="loading-chip">Atualizando...</div> : null}
        </div>
      </section>

      {error ? <div className="alert error">{error}</div> : null}

      {selectedDay ? (
        <section className="panel selected-day-panel">
          <div>
            <strong>{formatDate(selectedDay.iso)}</strong>
            <span>{selectedDay.classes.length ? studentCountLabel(selectedDayStudentTotal) : 'Sem alunos'}</span>
          </div>
          <div className="selected-day-summary">
            {selectedDay.classes.length ? (
              calendarView === 'rooms' ? (
                selectedDay.rooms.map((room) => (
                  <span key={room.key} className="day-course-chip">
                    {roomLabel(room.sala_online)}{room.cursos.length ? ` - ${room.cursos.join(', ')}` : ''}
                  </span>
                ))
              ) : (
                selectedDay.classes.map((turma) => (
                  <button key={turma.id} className="day-course-chip" type="button" onClick={() => navigate(`/admin/turmas/${turma.id}`)}>
                    {turma.curso_nome}
                  </button>
                ))
              )
            ) : (
              <span>Sem cursos nessa data.</span>
            )}
          </div>
          <button className="primary-button" type="button" onClick={generateDayReport} disabled={reportLoading || !selectedDay.classes.length}>
            <Download size={18} />
            {reportLoading ? 'Gerando...' : 'Baixar relatório do dia'}
          </button>
        </section>
      ) : null}

      <section className="calendar-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((weekday) => (
          <strong key={weekday} className="weekday">
            {weekday}
          </strong>
        ))}
        {calendarDays.map((day) => (
          <article
            key={day.id || day.iso}
            className={`calendar-day ${day.blank ? 'blank' : ''} ${selectedDayIso === day.iso ? 'selected' : ''}`}
            onClick={() => {
              if (!day.blank) setSelectedDayIso(day.iso);
            }}
          >
            {!day.blank ? (
              <>
                <span className="day-number">{day.day}</span>
                {(calendarView === 'rooms' ? day.rooms.length : day.classes.length) ? (
                  calendarView === 'rooms' ? (
                    day.rooms.map((room) => (
                      <button
                        key={`${room.key}-${day.iso}`}
                        className={`calendar-event room-event ${room.done ? 'done' : ''}`}
                        style={roomEventStyle(room)}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDayIso(day.iso);
                        }}
                      >
                        <CalendarDays size={14} />
                        <span>{roomLabel(room.sala_online)}</span>
                        {room.locais.map((local) => (
                          <small key={local}>{local}</small>
                        ))}
                        <small>{studentCountLabel(room.total_alunos)}</small>
                        {room.done ? <small className="calendar-event-status">Concluido!</small> : null}
                      </button>
                    ))
                  ) : (
                    day.classes.map((turma) => (
                    <button
                      key={`${turma.id}-${day.iso}`}
                      className={`calendar-event ${isDoneStatus(turma.status) ? 'done' : ''}`}
                      style={eventStyle(turma)}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/admin/turmas/${turma.id}`);
                      }}
                    >
                      <CalendarDays size={14} />
                      <span>{turma.curso_nome}</span>
                      <small>{studentCountLabel(turma.total_alunos)}</small>
                      {isVisiblePlace(turma.local) ? <small>Local: {turma.local}</small> : null}
                      {isVisiblePlace(turma.sala_online) ? <small>Sala virtual: {turma.sala_online}</small> : null}
                      {isDoneStatus(turma.status) ? <small className="calendar-event-status">Concluido!</small> : null}
                    </button>
                    ))
                  )
                ) : (
                  <span className="no-event">Sem curso</span>
                )}
              </>
            ) : null}
          </article>
        ))}
      </section>

      {!classes.length ? <EmptyState title="Sem turmas no mês" description="Cadastre turmas com datas dentro do mês selecionado." /> : null}
    </div>
  );
}
