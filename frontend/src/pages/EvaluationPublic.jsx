import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import SwcLogo from '../components/SwcLogo.jsx';
import { formatDate, todayIso } from '../utils/date.js';

const questions = [
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

function emptyNotes() {
  return Array.from({ length: questions.length }, () => '');
}

export default function EvaluationPublic() {
  const { turmaId: routeTurmaId } = useParams();
  const [searchParams] = useSearchParams();
  const linkedTurmaId = routeTurmaId || searchParams.get('turma_id') || searchParams.get('turmaId') || '';
  const [classInfo, setClassInfo] = useState(null);
  const [cpf, setCpf] = useState('');
  const [validation, setValidation] = useState(null);
  const [notes, setNotes] = useState(emptyNotes);
  const [notaGeral, setNotaGeral] = useState('');
  const [date, setDate] = useState(todayIso());
  const [testeZoom, setTesteZoom] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [classLoading, setClassLoading] = useState(false);
  const [validatingCpf, setValidatingCpf] = useState(false);
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);
  const validationRequestId = useRef(0);

  useEffect(() => {
    setValidation(null);
    setMessage('');
    setError('');
    setClassInfo(null);

    if (!linkedTurmaId) {
      setClassLoading(false);
      return;
    }

    setClassLoading(true);
    api
      .get(`/public/classes/${linkedTurmaId}`)
      .then((response) => setClassInfo(response.data))
      .catch((err) => setError(getApiError(err)))
      .finally(() => setClassLoading(false));
  }, [linkedTurmaId]);

  useEffect(() => {
    if (!classInfo) return;

    const cpfDigits = cpf.replace(/\D/g, '');
    setValidation(null);

    if (cpfDigits.length > 0) {
      setMessage('');
      setError('');
    }

    if (cpfDigits.length !== 11) {
      setValidatingCpf(false);
      return;
    }

    const requestId = validationRequestId.current + 1;
    validationRequestId.current = requestId;
    const timeoutId = setTimeout(() => validateCpfValue(cpf, requestId), 500);

    return () => clearTimeout(timeoutId);
  }, [cpf, classInfo, linkedTurmaId]);

  async function validateCpfValue(nextCpf, requestId) {
    setError('');
    setMessage('');
    setValidation(null);
    setValidatingCpf(true);

    try {
      const { data } = await api.post('/public/evaluations/validate', { cpf: nextCpf, turma_id: linkedTurmaId });
      if (requestId !== validationRequestId.current) return;
      setValidation(data);
      if (!data.alreadyAnswered) {
        setNotes(emptyNotes());
        setNotaGeral('');
        setTesteZoom('');
        setComment('');
      }
      if (data.alreadyAnswered) {
        setMessage('Já existe uma avaliação enviada para este aluno nesta turma.');
      }
    } catch (err) {
      if (requestId !== validationRequestId.current) return;
      setError(getApiError(err));
    } finally {
      if (requestId === validationRequestId.current) {
        setValidatingCpf(false);
      }
    }
  }

  async function submitEvaluation(event) {
    event.preventDefault();
    if (!validation || validation.alreadyAnswered) return;
    setError('');
    setMessage('');

    if (notes.some((note) => !note) || notaGeral === '' || !testeZoom) {
      setError('Responda todas as notas, a nota geral e o teste de Zoom antes de enviar.');
      return;
    }

    setSubmittingEvaluation(true);

    try {
      await api.post('/public/evaluations', {
        aluno_id: validation.aluno.id,
        turma_id: validation.turma.id,
        data_avaliacao: date,
        notas: notes.map(Number),
        nota_geral: Number(notaGeral),
        teste_zoom: testeZoom,
        comentario: comment
      });
      setMessage('Avaliação enviada com sucesso. Obrigado pelo retorno.');
      setValidation(null);
      setCpf('');
      setNotes(emptyNotes());
      setNotaGeral('');
      setTesteZoom('');
      setComment('');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmittingEvaluation(false);
    }
  }

  function setQuestionNote(index, value) {
    setNotes((current) => current.map((note, noteIndex) => (noteIndex === index ? value : note)));
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <SwcLogo />
      </header>

      <main className="public-content narrow">
        <section className="registration-panel">
          <div className="section-heading">
            <span>Avaliação de curso</span>
            <h1>Formulário de avaliação</h1>
            <p>Confirme seu CPF para liberar o questionário desta turma.</p>
          </div>

          {classLoading ? <div className="loading">Carregando turma...</div> : null}

          {!linkedTurmaId && !classLoading ? (
            <EmptyState title="Link de avaliação inválido" description="Use o link específico enviado para a sua turma." />
          ) : null}

          {classInfo ? (
            <div className="form-grid">
              <Field label="Curso">
                <input value={classInfo.curso_nome} readOnly />
              </Field>
              <Field label="Instrutor">
                <input value={classInfo.instrutor_nome} readOnly />
              </Field>
              <Field label="Período">
                <input value={`${formatDate(classInfo.data_inicio)} a ${formatDate(classInfo.data_fim)}`} readOnly />
              </Field>
              <Field label="Local">
                <input value={classInfo.local || ''} readOnly />
              </Field>
              {classInfo.sala_online ? (
                <Field label="Sala online">
                  <input value={classInfo.sala_online} readOnly />
                </Field>
              ) : null}
              <Field label="CPF" hint="A validação será feita automaticamente ao informar os 11 dígitos.">
                <input value={cpf} onChange={(event) => setCpf(event.target.value)} required />
              </Field>
              {validatingCpf ? <div className="alert success form-wide">Validando CPF...</div> : null}
            </div>
          ) : null}

          {error ? <div className="alert error">{error}</div> : null}
          {message ? <div className="alert success">{message}</div> : null}

          {validation && !validation.alreadyAnswered ? (
            <form className="evaluation-form" onSubmit={submitEvaluation}>
              <div className="locked-info">
                <CheckCircle2 size={20} />
                <div>
                  <strong>{validation.aluno.nome_completo}</strong>
                  <span>Nome validado automaticamente pelo CPF informado.</span>
                </div>
              </div>

              <div className="form-grid">
                <Field label="Data">
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
                </Field>
                <Field label="Curso">
                  <input value={validation.curso.nome} readOnly />
                </Field>
                <Field label="Instrutor">
                  <input value={validation.instrutor.nome} readOnly />
                </Field>
                <Field label="Local">
                  <input value={validation.turma.local || ''} readOnly />
                </Field>
                {validation.turma.sala_online ? (
                  <Field label="Sala online">
                    <input value={validation.turma.sala_online} readOnly />
                  </Field>
                ) : null}
              </div>

              <div className="question-list">
                {questions.map((question, index) => (
                  <div className="question-row" key={question}>
                    <span>
                      {index + 1}. {question}
                    </span>
                    <div className="rating-group" role="radiogroup" aria-label={question}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button key={value} type="button" className={Number(notes[index]) === value ? 'active' : ''} onClick={() => setQuestionNote(index, value)}>
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-grid">
                <Field label="Nota geral (0 a 10)">
                  <input type="number" min="0" max="10" step="0.1" value={notaGeral} onChange={(event) => setNotaGeral(event.target.value)} required />
                </Field>
                <Field label="Teste de Zoom">
                  <select value={testeZoom} onChange={(event) => setTesteZoom(event.target.value)} required>
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </Field>
                <Field label="Comentários">
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
                </Field>
              </div>

              <div className="form-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setValidation(null);
                    setCpf('');
                  }}
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
                <button className="primary-button" type="submit" disabled={submittingEvaluation}>
                  <Send size={18} />
                  {submittingEvaluation ? 'Enviando...' : 'Enviar avaliação'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}
