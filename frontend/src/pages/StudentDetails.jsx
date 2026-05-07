import { ArrowLeft, BookOpen, Edit3, ExternalLink, FileText, FileUp, Folder, GraduationCap, Mail, MapPin, Phone, Save, Trash2, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { formatFileSize, isDoneStatus, isVisiblePlace } from '../utils/display.js';

const sexOptions = ['Masculino', 'Feminino', 'Prefiro não dizer', 'Outro'];
const operations = ['Workover', 'Perfuração', 'Perfuração + Workover'];
const roles = ['Plataformista', 'Torrista', 'Sondador', 'Encarregado', 'Coordenador', 'Téc. operação', 'Operador', 'Engenheiro', 'Supervisor', 'Outro'];

const initialForm = {
  nome_completo: '',
  data_nascimento: '',
  telefone: '',
  cpf: '',
  email: '',
  sexo: 'Masculino',
  sexo_outro: '',
  cep: '',
  rua: '',
  bairro: '',
  numero: '',
  cidade: '',
  estado: '',
  responsavel_inscricao: 'Particular',
  empresa_id: '',
  empresa: '',
  sonda_unidade: '',
  operacao: 'Workover',
  funcao: 'Plataformista',
  funcao_outro: '',
  observacao: ''
};

function formFromStudent(student) {
  return {
    nome_completo: student.nome_completo || '',
    data_nascimento: student.data_nascimento || '',
    telefone: student.telefone || '',
    cpf: student.cpf || '',
    email: student.email || '',
    sexo: student.sexo || 'Masculino',
    sexo_outro: student.sexo_outro || '',
    cep: student.cep || '',
    rua: student.rua || '',
    bairro: student.bairro || '',
    numero: student.numero || '',
    cidade: student.cidade || '',
    estado: student.estado || '',
    responsavel_inscricao: student.responsavel_inscricao || 'Particular',
    empresa_id: student.empresa_id ? String(student.empresa_id) : '',
    empresa: student.empresa || student.empresa_nome || '',
    sonda_unidade: student.sonda_unidade || '',
    operacao: student.operacao || 'Workover',
    funcao: student.funcao || 'Plataformista',
    funcao_outro: student.funcao_outro || '',
    observacao: student.observacao || ''
  };
}

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

function classLabel(turma) {
  return `${turma.curso_nome} - ${formatDate(turma.data_inicio)} a ${formatDate(turma.data_fim)}`;
}

function documentClassLabel(document) {
  return `${document.turma_curso_nome || 'Turma'} - ${formatDate(document.turma_data_inicio)} a ${formatDate(document.turma_data_fim)}`;
}

function DocumentRow({ document, onRemove }) {
  return (
    <div className="document-row">
      <FileText size={20} />
      <div>
        <strong>{document.nome_arquivo}</strong>
        <small>
          {document.tipo_arquivo || 'Arquivo'} - {formatFileSize(document.tamanho_bytes)}
        </small>
        <span>{document.drive_url ? 'Salvo no Google Drive' : 'Google Drive pendente'}</span>
      </div>
      <div className="document-row-actions">
        {document.drive_url ? (
          <a className="icon-button" href={document.drive_url} target="_blank" rel="noreferrer" aria-label="Abrir documento no Google Drive">
            <ExternalLink size={17} />
          </a>
        ) : null}
        <button className="icon-button danger" type="button" onClick={() => onRemove(document.id)} aria-label="Remover documento">
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [student, setStudent] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [savingStudent, setSavingStudent] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDocumentClassId, setSelectedDocumentClassId] = useState('');
  const [savingDocument, setSavingDocument] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadStudent() {
    const { data } = await api.get(`/students/${id}`);
    setStudent(data);
    setForm(formFromStudent(data));
  }

  async function loadInitialData() {
    const [studentResponse, companyResponse] = await Promise.all([api.get(`/students/${id}`), api.get('/companies')]);
    setStudent(studentResponse.data);
    setForm(formFromStudent(studentResponse.data));
    setCompanies(companyResponse.data);
  }

  useEffect(() => {
    loadInitialData().catch((err) => setError(getApiError(err)));
  }, [id]);

  const address = useMemo(() => {
    if (!student) return '';
    return [student.rua, student.numero, student.bairro, student.cidade, student.estado].filter(Boolean).join(', ');
  }, [student]);

  const role = useMemo(() => {
    if (!student) return '';
    return student.funcao === 'Outro' ? student.funcao_outro : student.funcao;
  }, [student]);

  const sex = useMemo(() => {
    if (!student) return '';
    return student.sexo === 'Outro' ? student.sexo_outro : student.sexo;
  }, [student]);

  const documentGroups = useMemo(() => {
    const groups = new Map();
    const unlinked = [];

    (student?.documentos || []).forEach((document) => {
      if (!document.turma_id) {
        unlinked.push(document);
        return;
      }

      const key = String(document.turma_id);
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          title: documentClassLabel(document),
          subtitle: document.turma_instrutor_nome ? `Instrutor: ${document.turma_instrutor_nome}` : '',
          documents: []
        });
      }

      groups.get(key).documents.push(document);
    });

    return {
      linked: Array.from(groups.values()),
      unlinked
    };
  }, [student]);

  function update(field, value) {
    setForm((current) => {
      if (field === 'responsavel_inscricao' && value === 'Particular') {
        return { ...current, responsavel_inscricao: value, empresa_id: '', empresa: '' };
      }

      if (field === 'empresa_id') {
        const company = companies.find((item) => String(item.id) === String(value));
        return { ...current, empresa_id: value, empresa: company?.nome || '' };
      }

      return { ...current, [field]: value };
    });
  }

  function startEdit() {
    setError('');
    setSuccess('');
    setForm(formFromStudent(student));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm(formFromStudent(student));
    setError('');
  }

  async function saveStudent(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingStudent(true);

    try {
      await api.put(`/students/${id}`, form);
      await loadStudent();
      setEditing(false);
      setSuccess('Cadastro do aluno atualizado com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingStudent(false);
    }
  }

  async function saveDocument(event) {
    event.preventDefault();
    if (!selectedFiles.length) {
      setError('Selecione um ou mais arquivos para anexar.');
      return;
    }

    setError('');
    setSavingDocument(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('arquivos', file);
      });
      if (selectedDocumentClassId) {
        formData.append('turma_id', selectedDocumentClassId);
      }

      await api.post(`/students/${id}/documents`, formData);
      setSelectedFiles([]);
      setSelectedDocumentClassId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadStudent();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingDocument(false);
    }
  }

  async function removeDocument(documentId) {
    if (!confirm('Remover documento deste aluno?')) return;

    setError('');
    try {
      await api.delete(`/students/${id}/documents/${documentId}`);
      await loadStudent();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function removeStudent() {
    if (student.turmas?.length) {
      setSuccess('');
      setError('Este aluno esta vinculado a uma ou mais turmas e nao pode ser excluido.');
      return;
    }

    if (!confirm(`Excluir o aluno ${student.nome_completo}?`)) return;

    setError('');
    setSuccess('');
    setDeletingStudent(true);

    try {
      await api.delete(`/students/${id}`);
      navigate('/admin/alunos');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeletingStudent(false);
    }
  }

  if (error && !student) {
    return <div className="alert error">{error}</div>;
  }

  if (!student) {
    return <div className="loading">Carregando perfil do aluno...</div>;
  }

  return (
    <div className="page-stack">
      <div className="detail-toolbar">
        <button className="ghost-button" type="button" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        {!editing ? (
          <div className="inline-actions">
            <button className="primary-button" type="button" onClick={startEdit}>
              <Edit3 size={18} />
              Editar cadastro
            </button>
            <button
              className="ghost-button danger"
              type="button"
              onClick={removeStudent}
              disabled={deletingStudent}
              title={student.turmas?.length ? 'Aluno vinculado a turma' : 'Excluir aluno'}
            >
              <Trash2 size={16} />
              {deletingStudent ? 'Excluindo...' : 'Excluir aluno'}
            </button>
          </div>
        ) : null}
      </div>

      <div className="section-heading">
        <span>Aluno</span>
        <h1>{student.nome_completo}</h1>
        <p>Dados cadastrais, turmas vinculadas e documentos anexados ao aluno.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      {!editing ? (
      <section className="panel">
        <div className="panel-heading">
          <h2>Informacoes do aluno</h2>
          <span>{student.cpf}</span>
        </div>
        <div className="info-grid">
          <InfoItem label="ID do aluno" value={student.id} />
          <InfoItem icon={UserRound} label="Nome completo" value={student.nome_completo} />
          <InfoItem label="CPF" value={student.cpf} />
          <InfoItem icon={UserRound} label="Nascimento" value={formatDate(student.data_nascimento)} />
          <InfoItem icon={Phone} label="Telefone" value={student.telefone} />
          <InfoItem icon={Mail} label="Email" value={student.email} />
          <InfoItem label="Sexo" value={sex} />
          <InfoItem label="CEP" value={student.cep} />
          <InfoItem label="Rua" value={student.rua} />
          <InfoItem label="Bairro" value={student.bairro} />
          <InfoItem label="Numero" value={student.numero} />
          <InfoItem label="Cidade" value={student.cidade} />
          <InfoItem label="Estado" value={student.estado} />
          <InfoItem icon={MapPin} label="Endereco completo" value={address} />
          <InfoItem icon={BookOpen} label="Responsavel pela inscricao" value={student.responsavel_inscricao} />
          <InfoItem label="Empresa" value={student.responsavel_inscricao === 'Empresa' ? student.empresa_nome || student.empresa : 'Particular'} />
          <InfoItem icon={GraduationCap} label="Funcao" value={role} />
          <InfoItem label="Sonda / unidade" value={student.sonda_unidade} />
          <InfoItem label="Operacao" value={student.operacao} />
          <InfoItem label="Cadastro" value={formatDate(student.criado_em?.slice(0, 10))} />
          <InfoItem label="Ultima atualizacao" value={formatDate(student.atualizado_em?.slice(0, 10))} />
        </div>
        {student.observacao ? (
          <div className="detail-notes">
            <strong>Observacao</strong>
            <p>{student.observacao}</p>
          </div>
        ) : null}
      </section>
      ) : null}

      {editing ? (
        <section className="panel">
          <div className="panel-heading">
            <h2>Editar cadastro</h2>
            <small>CPF bloqueado para preservar o historico.</small>
          </div>

          <form className="form-grid" onSubmit={saveStudent}>
            <Field label="Nome completo">
              <input value={form.nome_completo} onChange={(event) => update('nome_completo', event.target.value)} required />
            </Field>
            <Field label="Data de nascimento">
              <input type="date" value={form.data_nascimento} onChange={(event) => update('data_nascimento', event.target.value)} required />
            </Field>
            <Field label="Telefone">
              <input value={form.telefone} onChange={(event) => update('telefone', event.target.value)} required />
            </Field>
            <Field label="CPF" hint="CPF nao pode ser alterado.">
              <input value={form.cpf} readOnly />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
            </Field>
            <Field label="Sexo">
              <select value={form.sexo} onChange={(event) => update('sexo', event.target.value)} required>
                {sexOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            {form.sexo === 'Outro' ? (
              <Field label="Qual sexo?">
                <input value={form.sexo_outro} onChange={(event) => update('sexo_outro', event.target.value)} required />
              </Field>
            ) : null}

            <Field label="CEP">
              <input value={form.cep} onChange={(event) => update('cep', event.target.value)} required />
            </Field>
            <Field label="Rua">
              <input value={form.rua} onChange={(event) => update('rua', event.target.value)} required />
            </Field>
            <Field label="Bairro">
              <input value={form.bairro} onChange={(event) => update('bairro', event.target.value)} required />
            </Field>
            <Field label="Numero">
              <input value={form.numero} onChange={(event) => update('numero', event.target.value)} required />
            </Field>
            <Field label="Cidade">
              <input value={form.cidade} onChange={(event) => update('cidade', event.target.value)} required />
            </Field>
            <Field label="Estado">
              <input value={form.estado} onChange={(event) => update('estado', event.target.value)} required />
            </Field>

            <Field label="Responsavel pela inscricao">
              <select value={form.responsavel_inscricao} onChange={(event) => update('responsavel_inscricao', event.target.value)} required>
                <option value="Particular">Particular</option>
                <option value="Empresa">Empresa</option>
              </select>
            </Field>
            {form.responsavel_inscricao === 'Empresa' ? (
              <Field label="Empresa">
                <select value={form.empresa_id} onChange={(event) => update('empresa_id', event.target.value)} required>
                  <option value="">{companies.length ? 'Selecione' : 'Nenhuma empresa cadastrada'}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.nome}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field label="Sonda / unidade operacional">
              <input value={form.sonda_unidade} onChange={(event) => update('sonda_unidade', event.target.value)} required />
            </Field>
            <Field label="Operacao">
              <select value={form.operacao} onChange={(event) => update('operacao', event.target.value)} required>
                {operations.map((operation) => (
                  <option key={operation} value={operation}>
                    {operation}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Funcao">
              <select value={form.funcao} onChange={(event) => update('funcao', event.target.value)} required>
                {roles.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </Field>
            {form.funcao === 'Outro' ? (
              <Field label="Qual funcao?">
                <input value={form.funcao_outro} onChange={(event) => update('funcao_outro', event.target.value)} required />
              </Field>
            ) : null}

            <Field label="Observacao" className="form-wide">
              <textarea value={form.observacao} onChange={(event) => update('observacao', event.target.value)} />
            </Field>

            <div className="form-actions form-wide">
              <button className="primary-button" type="submit" disabled={savingStudent}>
                <Save size={18} />
                {savingStudent ? 'Salvando...' : 'Salvar cadastro'}
              </button>
              <button className="ghost-button" type="button" onClick={cancelEdit}>
                <X size={16} />
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Turmas do aluno</h2>
          <span>{student.turmas?.length || 0} registros</span>
        </div>
        {student.turmas?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Instrutor</th>
                  <th>Periodo</th>
                  <th>Local</th>
                  <th>Modalidade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {student.turmas.map((turma) => (
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
                      {isVisiblePlace(turma.local) ? <strong>{turma.local}</strong> : '-'}
                      {isVisiblePlace(turma.sala_online) ? <small>Sala online: {turma.sala_online}</small> : null}
                    </td>
                    <td>
                      <span className="modality-pill">
                        {turma.modalidade_aula_nome || turma.classificacao_presenca_nome || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${isDoneStatus(turma.status_turma) ? 'done' : 'active'}`}>{turma.status_turma}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem turmas vinculadas" description="Este aluno ainda nao foi vinculado a uma turma." />
        )}
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="panel-heading">
            <h2>Documentos</h2>
            <span>{student.documentos?.length || 0} anexos</span>
          </div>
          {student.documentos?.length ? (
            <div className="document-groups">
              {documentGroups.linked.map((group) => (
                <details key={group.id} className="document-folder" open>
                  <summary>
                    <Folder size={20} />
                    <div>
                      <strong>{group.title}</strong>
                      {group.subtitle ? <small>{group.subtitle}</small> : null}
                    </div>
                    <span>{group.documents.length} anexo(s)</span>
                  </summary>
                  <div className="document-list document-folder-list">
                    {group.documents.map((document) => (
                      <DocumentRow key={document.id} document={document} onRemove={removeDocument} />
                    ))}
                  </div>
                </details>
              ))}

              {documentGroups.unlinked.length ? (
                <div className="document-unlinked">
                  {documentGroups.linked.length ? <h3>Sem turma vinculada</h3> : null}
                  <div className="document-list">
                    {documentGroups.unlinked.map((document) => (
                      <DocumentRow key={document.id} document={document} onRemove={removeDocument} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState title="Sem documentos" description="Anexe documentos do aluno para deixar o cadastro preparado." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Anexar documento</h2>
          </div>
          <form className="stack" onSubmit={saveDocument}>
            <Field label="Arquivo">
              <input ref={fileInputRef} type="file" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))} />
              {selectedFiles.length ? (
                <small>
                  {selectedFiles.length} arquivo(s): {selectedFiles.map((file) => file.name).join(', ')}
                </small>
              ) : null}
            </Field>
            <Field label="Vincular a turma" hint="Opcional. Sem vínculo, o documento fica na lista geral do aluno.">
              <select value={selectedDocumentClassId} onChange={(event) => setSelectedDocumentClassId(event.target.value)} disabled={!student.turmas?.length}>
                <option value="">{student.turmas?.length ? 'Sem turma vinculada' : 'Aluno sem turmas vinculadas'}</option>
                {student.turmas?.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {classLabel(turma)}
                  </option>
                ))}
              </select>
            </Field>
            <button className="primary-button" type="submit" disabled={savingDocument}>
              <FileUp size={18} />
              {savingDocument ? 'Anexando...' : 'Anexar documento(s)'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
