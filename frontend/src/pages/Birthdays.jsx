import { Cake, CheckCircle2, ChevronLeft, ChevronRight, Copy, Edit3, MessageSquareText, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { currentMonthIso } from '../utils/date.js';

const initialMessageForm = {
  titulo: '',
  conteudo: ''
};

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

function shiftMonth(month, amount) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthTitle(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function firstName(fullName = '') {
  return String(fullName).trim().split(/\s+/)[0] || fullName;
}

function birthdayPhone(phone = '') {
  return String(phone).trim() || 'Sem telefone';
}

export default function Birthdays() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonthIso());
  const [students, setStudents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messageForm, setMessageForm] = useState(initialMessageForm);
  const [editingMessage, setEditingMessage] = useState(null);
  const [copied, setCopied] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [error, setError] = useState('');
  const copiedTimeout = useRef(null);

  async function loadMessages() {
    const { data } = await api.get('/students/birthday-messages');
    setMessages(data);
    setSelectedMessageId((current) => current || (data[0]?.id ? String(data[0].id) : ''));
    return data;
  }

  async function loadBirthdays(nextMonth = month, nextMessageId = selectedMessageId) {
    const params = { month: nextMonth };
    if (nextMessageId) {
      params.messageId = nextMessageId;
    }

    const { data } = await api.get('/students/birthdays', { params });
    setStudents(data);
    return data;
  }

  useEffect(() => {
    async function loadInitialData() {
      const loadedMessages = await loadMessages();
      await loadBirthdays(month, loadedMessages[0]?.id ? String(loadedMessages[0].id) : '');
    }

    loadInitialData().catch((err) => setError(getApiError(err)));

    return () => {
      if (copiedTimeout.current) {
        clearTimeout(copiedTimeout.current);
      }
    };
  }, []);

  const calendarDays = useMemo(() => {
    const map = new Map();
    const [year, monthNumber] = month.split('-').map(Number);

    students.forEach((student) => {
      const iso = `${year}-${String(monthNumber).padStart(2, '0')}-${String(student.dia).padStart(2, '0')}`;
      map.set(iso, [...(map.get(iso) || []), student]);
    });

    return daysInMonth(month).map((day) => ({
      ...day,
      students: day.iso ? map.get(day.iso) || [] : []
    }));
  }, [month, students]);

  function resetCopiedFeedback() {
    setCopied(false);
    if (copiedTimeout.current) {
      clearTimeout(copiedTimeout.current);
      copiedTimeout.current = null;
    }
  }

  async function refreshBirthdays(nextMonth = month, nextMessageId = selectedMessageId) {
    setError('');
    try {
      await loadBirthdays(nextMonth, nextMessageId);
      setSelectedStudent(null);
      resetCopiedFeedback();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function changeMonth(value) {
    setMonth(value);
    await refreshBirthdays(value, selectedMessageId);
  }

  async function navigateMonth(amount) {
    const nextMonth = shiftMonth(month, amount);
    setMonth(nextMonth);
    await refreshBirthdays(nextMonth, selectedMessageId);
  }

  async function changeMessageTemplate(value) {
    setSelectedMessageId(value);
    await refreshBirthdays(month, value);
  }

  function selectStudent(student) {
    setSelectedStudent(student);
    resetCopiedFeedback();
  }

  async function copyMessage() {
    if (!selectedStudent?.mensagem) return;

    try {
      await navigator.clipboard.writeText(selectedStudent.mensagem);
      setCopied(true);
      copiedTimeout.current = setTimeout(() => {
        setCopied(false);
        copiedTimeout.current = null;
      }, 2400);
    } catch {
      setError('Não foi possível copiar a mensagem.');
    }
  }

  async function saveMessage(event) {
    event.preventDefault();
    setError('');
    setSavingMessage(true);

    try {
      if (editingMessage) {
        await api.put(`/students/birthday-messages/${editingMessage.id}`, messageForm);
      } else {
        await api.post('/students/birthday-messages', messageForm);
      }

      const loadedMessages = await loadMessages();
      const nextMessageId = editingMessage ? String(editingMessage.id) : String(loadedMessages[loadedMessages.length - 1]?.id || loadedMessages[0]?.id || '');
      setSelectedMessageId(nextMessageId);
      await loadBirthdays(month, nextMessageId);
      setEditingMessage(null);
      setMessageForm(initialMessageForm);
      setSelectedStudent(null);
      resetCopiedFeedback();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingMessage(false);
    }
  }

  function editMessage(message) {
    setEditingMessage(message);
    setMessageForm({ titulo: message.titulo, conteudo: message.conteudo });
  }

  async function removeMessage(messageId) {
    if (!confirm('Excluir mensagem padrão?')) return;

    setError('');
    try {
      await api.delete(`/students/birthday-messages/${messageId}`);
      const loadedMessages = await loadMessages();
      const nextMessageId = selectedMessageId === String(messageId) ? String(loadedMessages[0]?.id || '') : selectedMessageId;
      setSelectedMessageId(nextMessageId);
      await loadBirthdays(month, nextMessageId);
      setSelectedStudent(null);
      resetCopiedFeedback();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Relacionamento</span>
        <h1>Aniversariantes</h1>
        <p>Visualize aniversários por mês, copie mensagens promocionais e gerencie os modelos padrão.</p>
      </div>

      <section className="panel">
        <div className="filters">
          <Field label="Mês">
            <div className="month-navigation">
              <button className="icon-button" type="button" onClick={() => navigateMonth(-1)} aria-label="Mês anterior">
                <ChevronLeft size={18} />
              </button>
              <input type="month" value={month} onChange={(event) => changeMonth(event.target.value)} />
              <button className="icon-button" type="button" onClick={() => navigateMonth(1)} aria-label="Próximo mês">
                <ChevronRight size={18} />
              </button>
            </div>
          </Field>
          <Field label="Mensagem padrão">
            <select value={selectedMessageId} onChange={(event) => changeMessageTemplate(event.target.value)}>
              <option value="">{messages.length ? 'Selecione' : 'Cadastre uma mensagem'}</option>
              {messages.map((message) => (
                <option key={message.id} value={message.id}>
                  {message.titulo}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="calendar-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((weekday) => (
          <strong key={weekday} className="weekday">
            {weekday}
          </strong>
        ))}
        {calendarDays.map((day) => (
          <article key={day.id || day.iso} className={`calendar-day ${day.blank ? 'blank' : ''}`}>
            {!day.blank ? (
              <>
                <span className="day-number">{day.day}</span>
                {day.students.length ? (
                  day.students.map((student) => (
                    <button
                      key={student.id}
                      className="calendar-event birthday"
                      type="button"
                      onClick={() => selectStudent(student)}
                      onDoubleClick={() => navigate(`/admin/alunos/${student.id}`)}
                    >
                      <Cake size={14} />
                      <span>{firstName(student.nome_completo)}</span>
                      <small>{birthdayPhone(student.telefone)}</small>
                    </button>
                  ))
                ) : (
                  <span className="no-event">Sem aniversariante</span>
                )}
              </>
            ) : null}
          </article>
        ))}
      </section>

      {!students.length ? <EmptyState title={`Sem aniversariantes em ${monthTitle(month)}`} description="Não há alunos fazendo aniversário no mês escolhido." /> : null}

      <section className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h2>Mensagem</h2>
          </div>
          {selectedStudent ? (
            <div className="message-box">
              <MessageSquareText size={22} />
              <strong>{selectedStudent.nome_completo}</strong>
              <span>{birthdayPhone(selectedStudent.telefone)}</span>
              <pre>{selectedStudent.mensagem || 'Nenhuma mensagem padrão selecionada.'}</pre>
              <button className={`ghost-button copy-message-button ${copied ? 'copied' : ''}`} type="button" onClick={copyMessage} aria-live="polite">
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Mensagem copiada' : 'Copiar mensagem'}
              </button>
            </div>
          ) : (
            <EmptyState title="Selecione um aniversariante" description="Clique em um aluno no calendário para ver a mensagem." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>{editingMessage ? 'Editar mensagem padrão' : 'Nova mensagem padrão'}</h2>
          </div>
          <form className="stack" onSubmit={saveMessage}>
            <Field label="Título">
              <input value={messageForm.titulo} onChange={(event) => setMessageForm((current) => ({ ...current, titulo: event.target.value }))} required />
            </Field>
            <Field label="Mensagem" hint="Você pode usar {primeiro_nome}, {nome}, {email} e {telefone}.">
              <textarea value={messageForm.conteudo} onChange={(event) => setMessageForm((current) => ({ ...current, conteudo: event.target.value }))} required />
            </Field>
            <div className="inline-actions">
              <button className="primary-button" type="submit" disabled={savingMessage}>
                <Save size={18} />
                {savingMessage ? 'Salvando...' : editingMessage ? 'Salvar mensagem' : 'Cadastrar mensagem'}
              </button>
              {editingMessage ? (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageForm(initialMessageForm);
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Mensagens padrão cadastradas</h2>
        </div>
        {messages.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Mensagem</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td>{message.titulo}</td>
                    <td>
                      <small>{message.conteudo}</small>
                    </td>
                    <td className="table-actions">
                      <button className="icon-button" type="button" onClick={() => editMessage(message)} aria-label="Editar mensagem padrão">
                        <Edit3 size={17} />
                      </button>
                      <button className="icon-button danger" type="button" onClick={() => removeMessage(message.id)} aria-label="Excluir mensagem padrão">
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma mensagem padrão" description="Cadastre uma mensagem para gerar textos de aniversário." />
        )}
      </section>
    </div>
  );
}
