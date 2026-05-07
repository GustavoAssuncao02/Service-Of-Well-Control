import { ArrowLeft, Download, FileImage, GraduationCap, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState } from '../components/Field.jsx';
import SwcLogo from '../components/SwcLogo.jsx';
import { formatDate } from '../utils/date.js';
import { downloadReactionEvaluationPdf, downloadReactionEvaluationPng, reactionCriteriaLabels } from '../utils/reactionEvaluationExport.js';

function InfoItem({ label, value, icon: Icon }) {
  return (
    <div className="info-item">
      {Icon ? <Icon size={18} /> : null}
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function formatNumber(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toFixed(decimals);
}

export default function EvaluationReaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    api
      .get(`/evaluations/${id}`)
      .then((response) => {
        if (active) setEvaluation(response.data);
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
  }, [id]);

  const criteria = useMemo(
    () =>
      reactionCriteriaLabels.map((label, index) => ({
        label,
        score: evaluation?.[`nota_${index + 1}`]
      })),
    [evaluation]
  );

  if (loading) return <div className="loading">Carregando avaliacao...</div>;
  if (error) return <div className="alert error">{error}</div>;
  if (!evaluation) return <EmptyState title="Avaliacao nao encontrada" description="Verifique se ela ainda existe no sistema." />;

  return (
    <div className="page-stack">
      <div className="detail-toolbar">
        <button className="ghost-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="detail-toolbar-actions">
          <button className="primary-button" type="button" onClick={() => downloadReactionEvaluationPdf(evaluation)}>
            <Download size={18} />
            Gerar avaliacao de reacao
          </button>
          <button className="ghost-button" type="button" onClick={() => downloadReactionEvaluationPng(evaluation)}>
            <FileImage size={16} />
            PNG
          </button>
        </div>
      </div>

      <section className="panel reaction-document">
        <header className="reaction-header">
          <SwcLogo className="reaction-logo" />
          <div>
            <span>Service Of WellControl</span>
            <h1>Avaliacao de reacao</h1>
            <p>
              {evaluation.curso_nome} - {formatDate(evaluation.data_avaliacao)}
            </p>
          </div>
          <strong>{formatNumber(evaluation.nota_geral, 2)}/10</strong>
        </header>

        <div className="detail-grid">
          <InfoItem icon={UserRound} label="Aluno" value={evaluation.aluno_nome} />
          <InfoItem label="CPF" value={evaluation.cpf} />
          <InfoItem icon={Mail} label="Email" value={evaluation.aluno_email} />
          <InfoItem icon={Phone} label="Telefone" value={evaluation.aluno_telefone} />
          <InfoItem label="Empresa" value={evaluation.empresa || 'Particular'} />
          <InfoItem icon={MapPin} label="Cidade/UF" value={`${evaluation.cidade || '-'} / ${evaluation.estado || '-'}`} />
          <InfoItem icon={GraduationCap} label="Curso" value={evaluation.curso_nome} />
          <InfoItem label="Classificacao" value={evaluation.classificacao_nome} />
          <InfoItem label="Instrutor" value={evaluation.instrutor_nome} />
          <InfoItem label="Periodo da turma" value={`${formatDate(evaluation.data_inicio)} a ${formatDate(evaluation.data_fim)}`} />
          <InfoItem label="Local" value={evaluation.local} />
          <InfoItem label="Sala online" value={evaluation.sala_online} />
        </div>

        <section className="reaction-score-panel">
          <div>
            <span>Nota geral</span>
            <strong>{formatNumber(evaluation.nota_geral, 2)}</strong>
          </div>
          <div>
            <span>Teste Zoom</span>
            <strong>{evaluation.teste_zoom || '-'}</strong>
          </div>
          <div>
            <span>Data da avaliacao</span>
            <strong>{formatDate(evaluation.data_avaliacao)}</strong>
          </div>
        </section>

        <section className="reaction-criteria">
          <div className="panel-heading">
            <h2>Avaliacao de reacao</h2>
          </div>
          <div className="criteria-list reaction-criteria-list">
            {criteria.map((criterion, index) => (
              <div key={criterion.label}>
                <span>
                  {index + 1}. {criterion.label}
                </span>
                <strong>{criterion.score ?? '-'}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="reaction-comment">
          <h2>Comentario</h2>
          <p>{evaluation.comentario || 'Sem comentario.'}</p>
        </section>
      </section>
    </div>
  );
}
