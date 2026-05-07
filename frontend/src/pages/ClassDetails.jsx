import { ArrowLeft, CalendarDays, CheckCircle2, Download, FileImage, GraduationCap, MapPin, Monitor, RotateCcw, Send, UsersRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { isDoneStatus, isVisiblePlace, studentCountLabel } from '../utils/display.js';
import { downloadClassReport, downloadClassReportPng } from '../utils/pdfReport.js';

function InfoItem({ label, value, icon: Icon }) {
  return (
    <div className="info-item">
      {Icon ? <Icon size={18} /> : null}
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function handleRowKeyDown(event, action) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

function evaluationAverageLabel(turma) {
  const total = Number(turma.total_avaliacoes_reacao || 0);
  if (!total) return 'Sem avaliacoes';

  const average = Number(turma.media_avaliacao_reacao || 0);
  return `${average.toFixed(2)}/10 (${total} ${total === 1 ? 'resposta' : 'respostas'})`;
}

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const evaluationLinkTimeout = useRef(null);
  const [turma, setTurma] = useState(null);
  const [copiedEvaluationStudentId, setCopiedEvaluationStudentId] = useState(null);
  const [error, setError] = useState('');

  async function loadClass() {
    const { data } = await api.get(`/classes/${id}`);
    setTurma(data);
  }

  useEffect(() => {
    loadClass().catch((err) => setError(getApiError(err)));

    return () => {
      if (evaluationLinkTimeout.current) {
        clearTimeout(evaluationLinkTimeout.current);
      }
    };
  }, [id]);

  async function completeClass() {
    setError('');
    try {
      await api.patch(`/classes/${id}/complete`);
      await loadClass();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function reopenClass() {
    if (!confirm('Reabrir esta turma e voltar todos os alunos para Em andamento?')) return;

    setError('');
    try {
      await api.patch(`/classes/${id}/reopen`);
      await loadClass();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function completeStudent(studentId) {
    setError('');
    try {
      await api.patch(`/classes/${id}/students/${studentId}/complete`);
      await loadClass();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function reopenStudent(studentId) {
    setError('');
    try {
      await api.patch(`/classes/${id}/students/${studentId}/reopen`);
      await loadClass();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function copyStudentEvaluationLink(studentId) {
    const link = `${window.location.origin}/avaliacao/${id}`;

    if (evaluationLinkTimeout.current) {
      clearTimeout(evaluationLinkTimeout.current);
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiedEvaluationStudentId(studentId);
      evaluationLinkTimeout.current = setTimeout(() => {
        setCopiedEvaluationStudentId(null);
        evaluationLinkTimeout.current = null;
      }, 2400);
    } catch {
      setError('Não foi possível copiar o link de avaliação.');
    }
  }

  if (error && !turma) {
    return <div className="alert error">{error}</div>;
  }

  if (!turma) {
    return <div className="loading">Carregando informacoes da turma...</div>;
  }

  const presencialCount = turma.alunos?.filter((student) => String(student.modalidade_aula_nome || '').startsWith('Presencial')).length || 0;
  const onlineCount = turma.alunos?.filter((student) => String(student.modalidade_aula_nome || '').startsWith('Online')).length || 0;

  return (
    <div className="page-stack">
      <div className="detail-toolbar">
        <button className="ghost-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="detail-toolbar-actions">
          {isDoneStatus(turma.status) ? (
            <button className="ghost-button" type="button" onClick={reopenClass}>
              <RotateCcw size={16} />
              Reabrir turma
            </button>
          ) : (
            <button className="ghost-button" type="button" onClick={completeClass}>
              <CheckCircle2 size={16} />
              Concluir turma
            </button>
          )}
          <button className="primary-button" type="button" onClick={() => downloadClassReport(turma)}>
            <Download size={18} />
            Baixar PDF
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadClassReportPng(turma)}>
            <FileImage size={16} />
            Baixar PNG
          </button>
        </div>
      </div>

      <div className="section-heading">
        <span>Turma</span>
        <h1>{turma.curso_nome}</h1>
        <p>Informacoes completas da turma e lista de alunos vinculados.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Informacoes da turma</h2>
          <span className={`status-badge ${isDoneStatus(turma.status) ? 'done' : 'active'}`}>{turma.status}</span>
        </div>
        <div className="info-grid">
          <InfoItem icon={CalendarDays} label="Periodo" value={`${formatDate(turma.data_inicio)} a ${formatDate(turma.data_fim)}`} />
          <InfoItem icon={GraduationCap} label="Instrutor" value={turma.instrutor_nome} />
          <InfoItem icon={UsersRound} label="Alunos" value={studentCountLabel(turma.alunos?.length || 0)} />
          <InfoItem label="Media da avaliacao" value={evaluationAverageLabel(turma)} />
          <InfoItem label="Presenciais" value={String(presencialCount)} />
          <InfoItem label="Online" value={String(onlineCount)} />
          <InfoItem label="Classificacao" value={turma.classificacao_nome} />
          {isVisiblePlace(turma.local) ? <InfoItem icon={MapPin} label="Local" value={turma.local} /> : null}
          {isVisiblePlace(turma.sala_online) ? <InfoItem icon={Monitor} label="Sala virtual" value={turma.sala_online} /> : null}
          <InfoItem label="Criada em" value={formatDate(turma.criado_em?.slice(0, 10))} />
          <InfoItem label="Atualizada em" value={formatDate(turma.atualizado_em?.slice(0, 10))} />
        </div>
        {turma.curso_descricao || turma.observacao ? (
          <div className="detail-notes">
            {turma.curso_descricao ? (
              <p>
                <strong>Curso:</strong> {turma.curso_descricao}
              </p>
            ) : null}
            {turma.observacao ? (
              <p>
                <strong>Observacao:</strong> {turma.observacao}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Alunos da turma</h2>
          <span>{studentCountLabel(turma.alunos?.length || 0)}</span>
        </div>
        {turma.alunos?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Empresa</th>
                  <th>Modalidade</th>
                  <th>Status</th>
                  <th>Avaliacao de reacao</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {turma.alunos.map((student) => (
                  <tr
                    key={student.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/alunos/${student.id}`)}
                    onKeyDown={(event) => handleRowKeyDown(event, () => navigate(`/admin/alunos/${student.id}`))}
                  >
                    <td>{student.nome_completo}</td>
                    <td>{student.empresa_nome || student.empresa || '-'}</td>
                    <td>
                      <span className="modality-pill">
                        {student.modalidade_aula_nome || student.classificacao_presenca_nome || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${isDoneStatus(student.status_turma) ? 'done' : 'active'}`}>{student.status_turma}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${student.avaliacao_id ? 'done' : 'pending'}`}>
                        {student.avaliacao_reacao_status || (student.avaliacao_id ? 'Respondeu' : 'Nao respondeu')}
                      </span>
                    </td>
                    <td>
                      {isDoneStatus(student.status_turma) ? (
                        <div className="inline-actions compact-actions">
                          <button
                            className={`small-button ${copiedEvaluationStudentId === student.id ? 'success' : ''}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              copyStudentEvaluationLink(student.id);
                            }}
                          >
                            {copiedEvaluationStudentId === student.id ? <CheckCircle2 size={15} /> : <Send size={15} />}
                            {copiedEvaluationStudentId === student.id ? 'Link copiado' : 'Enviar avaliação'}
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
                      ) : (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem alunos" description="Nenhum aluno esta vinculado a esta turma." />
        )}
      </section>
    </div>
  );
}
