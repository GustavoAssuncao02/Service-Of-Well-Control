import { Edit3, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';

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
  funcao_outro: ''
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
    empresa: student.empresa || '',
    sonda_unidade: student.sonda_unidade || '',
    operacao: student.operacao || 'Workover',
    funcao: student.funcao || 'Plataformista',
    funcao_outro: student.funcao_outro || ''
  };
}

function handleRowKeyDown(event, action) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
    const [studentResponse, companyResponse] = await Promise.all([api.get('/students'), api.get('/companies')]);
    setStudents(studentResponse.data);
    setCompanies(companyResponse.data);
  }

  useEffect(() => {
    loadData().catch((err) => setError(getApiError(err)));
  }, []);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;

    return students.filter((student) =>
      [student.nome_completo, student.cpf, student.email, student.telefone, student.empresa]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [search, students]);

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

  function startEdit(student) {
    setError('');
    setSuccess('');
    setEditingStudent(student);
    setForm(formFromStudent(student));
  }

  function cancelEdit() {
    setEditingStudent(null);
    setForm(initialForm);
    setError('');
  }

  async function saveStudent(event) {
    event.preventDefault();
    if (!editingStudent) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.put(`/students/${editingStudent.id}`, form);
      await loadData();
      setEditingStudent(null);
      setForm(initialForm);
      setSuccess('Cadastro do aluno atualizado com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(student) {
    if (Number(student.total_turmas || 0) > 0) {
      setSuccess('');
      setError('Este aluno esta vinculado a uma ou mais turmas e nao pode ser excluido.');
      return;
    }

    if (!confirm(`Excluir o aluno ${student.nome_completo}?`)) return;

    setError('');
    setSuccess('');
    setDeletingStudentId(student.id);

    try {
      await api.delete(`/students/${student.id}`);
      if (editingStudent?.id === student.id) {
        setEditingStudent(null);
        setForm(initialForm);
      }
      await loadData();
      setSuccess('Aluno excluido com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeletingStudentId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Cadastros</span>
        <h1>Alunos</h1>
        <p>Atualize os dados do cadastro dos alunos. O CPF fica bloqueado para preservar o histórico.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      {editingStudent ? (
        <section className="panel">
          <div className="panel-heading">
            <h2>Editar aluno</h2>
            <small>{editingStudent.nome_completo}</small>
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
            <Field label="CPF" hint="CPF não pode ser alterado.">
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
            <Field label="Número">
              <input value={form.numero} onChange={(event) => update('numero', event.target.value)} required />
            </Field>
            <Field label="Cidade">
              <input value={form.cidade} onChange={(event) => update('cidade', event.target.value)} required />
            </Field>
            <Field label="Estado">
              <input value={form.estado} onChange={(event) => update('estado', event.target.value)} required />
            </Field>

            <Field label="Responsável pela inscrição">
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
            <Field label="Operação">
              <select value={form.operacao} onChange={(event) => update('operacao', event.target.value)} required>
                {operations.map((operation) => (
                  <option key={operation} value={operation}>
                    {operation}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Função">
              <select value={form.funcao} onChange={(event) => update('funcao', event.target.value)} required>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </Field>
            {form.funcao === 'Outro' ? (
              <Field label="Qual função?">
                <input value={form.funcao_outro} onChange={(event) => update('funcao_outro', event.target.value)} required />
              </Field>
            ) : null}

            <div className="form-actions form-wide">
              <button className="primary-button" type="submit" disabled={saving}>
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar cadastro'}
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
          <h2>Alunos cadastrados</h2>
        </div>
        <Field label="Pesquisar aluno">
          <div className="input-icon">
            <Search size={18} />
            <input placeholder="Nome, CPF, email, telefone ou empresa" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </Field>

        {filteredStudents.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>CPF</th>
                  <th>Contato</th>
                  <th>Empresa</th>
                  <th>Turmas</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="clickable-row"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/alunos/${student.id}`)}
                    onKeyDown={(event) => handleRowKeyDown(event, () => navigate(`/admin/alunos/${student.id}`))}
                  >
                    <td>{student.nome_completo}</td>
                    <td>{student.cpf}</td>
                    <td>
                      <strong>{student.email}</strong>
                      <small>{student.telefone}</small>
                    </td>
                    <td>{student.empresa || '-'}</td>
                    <td>{student.total_turmas || 0}</td>
                    <td>{formatDate(student.criado_em?.slice(0, 10))}</td>
                    <td className="table-actions">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEdit(student);
                        }}
                        aria-label="Editar aluno"
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeStudent(student);
                        }}
                        disabled={deletingStudentId === student.id || Number(student.total_turmas || 0) > 0}
                        title={Number(student.total_turmas || 0) > 0 ? 'Aluno vinculado a turma' : 'Excluir aluno'}
                        aria-label="Excluir aluno"
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
          <EmptyState title="Nenhum aluno" description="Cadastros públicos aparecerão aqui." />
        )}
      </section>
    </div>
  );
}
