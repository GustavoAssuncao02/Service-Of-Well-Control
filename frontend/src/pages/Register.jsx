import { ArrowRight, Languages } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { Field } from '../components/Field.jsx';
import SwcLogo from '../components/SwcLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const languages = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' }
];

const copy = {
  pt: {
    eyebrow: 'Cadastro público',
    title: 'Inscrição de estudante',
    subtitle: 'Preencha seus dados para entrar na base de alunos da SWC.',
    fullName: 'Nome completo',
    birthDate: 'Data de nascimento',
    phone: 'Telefone',
    cpf: 'CPF',
    email: 'Email',
    sex: 'Sexo',
    otherSex: 'Qual sexo?',
    zip: 'CEP',
    street: 'Rua',
    district: 'Bairro',
    number: 'Número',
    city: 'Cidade',
    state: 'Estado',
    responsible: 'Responsável pela inscrição',
    company: 'Qual empresa?',
    unit: 'Qual a sonda / unidade operacional?',
    operation: 'Operação',
    role: 'Função',
    otherRole: 'Qual função?',
    cpfInvalid: 'Informe um CPF válido.',
    cpfIncomplete: 'Informe os 11 dígitos do CPF.',
    submit: 'Enviar cadastro',
    completeRegistration: 'Concluir cadastro',
    sending: 'Enviando...',
    existingTitle: 'Cadastro já localizado',
    existingMessage: 'Identificamos um cadastro vinculado a este CPF. Revise as informações do formulário e clique em Concluir cadastro para atualizar seus dados.',
    existingAction: 'Atualizar informações',
    personal: 'Particular',
    companyResponsible: 'Empresa'
  },
  en: {
    eyebrow: 'Public registration',
    title: 'Student enrollment',
    subtitle: 'Fill in your details to join the SWC student database.',
    fullName: 'Full name',
    birthDate: 'Date of birth',
    phone: 'Phone',
    cpf: 'CPF',
    email: 'Email',
    sex: 'Gender',
    otherSex: 'Specify gender',
    zip: 'ZIP code',
    street: 'Street',
    district: 'District',
    number: 'Number',
    city: 'City',
    state: 'State',
    responsible: 'Enrollment paid by',
    company: 'Company name',
    unit: 'Rig / operational unit',
    operation: 'Operation',
    role: 'Position',
    otherRole: 'Specify position',
    cpfInvalid: 'Enter a valid CPF.',
    cpfIncomplete: 'Enter the 11 CPF digits.',
    submit: 'Submit registration',
    completeRegistration: 'Complete registration',
    sending: 'Submitting...',
    existingTitle: 'Registration found',
    existingMessage: 'We found an existing registration linked to this CPF. Review the form information and click Complete registration to update your details.',
    existingAction: 'Update information',
    personal: 'Private',
    companyResponsible: 'Company'
  },
  es: {
    eyebrow: 'Registro público',
    title: 'Inscripción de estudiante',
    subtitle: 'Complete sus datos para ingresar a la base de alumnos de SWC.',
    fullName: 'Nombre completo',
    birthDate: 'Fecha de nacimiento',
    phone: 'Teléfono',
    cpf: 'CPF',
    email: 'Email',
    sex: 'Sexo',
    otherSex: 'Especifique el sexo',
    zip: 'Código postal',
    street: 'Calle',
    district: 'Barrio',
    number: 'Número',
    city: 'Ciudad',
    state: 'Estado',
    responsible: 'Responsable de la inscripción',
    company: 'Empresa',
    unit: 'Sonda / unidad operacional',
    operation: 'Operación',
    role: 'Función',
    otherRole: 'Especifique función',
    cpfInvalid: 'Informe un CPF válido.',
    cpfIncomplete: 'Informe los 11 dígitos del CPF.',
    submit: 'Enviar registro',
    completeRegistration: 'Concluir registro',
    sending: 'Enviando...',
    existingTitle: 'Registro localizado',
    existingMessage: 'Identificamos un registro vinculado a este CPF. Revise la información del formulario y haga clic en Concluir registro para actualizar sus datos.',
    existingAction: 'Actualizar información',
    personal: 'Particular',
    companyResponsible: 'Empresa'
  }
};

const sexOptions = [
  { value: 'Masculino', labels: { pt: 'Masculino', en: 'Male', es: 'Masculino' } },
  { value: 'Feminino', labels: { pt: 'Feminino', en: 'Female', es: 'Femenino' } },
  { value: 'Prefiro não dizer', labels: { pt: 'Prefiro não dizer', en: 'Prefer not to say', es: 'Prefiero no decir' } },
  { value: 'Outro', labels: { pt: 'Outro', en: 'Other', es: 'Otro' } }
];

const operationOptions = [
  { value: 'Workover', labels: { pt: 'Workover', en: 'Workover', es: 'Workover' } },
  { value: 'Perfuração', labels: { pt: 'Perfuração', en: 'Drilling', es: 'Perforación' } },
  { value: 'Perfuração + Workover', labels: { pt: 'Perfuração + Workover', en: 'Drilling + Workover', es: 'Perforación + Workover' } }
];

const roleOptions = [
  { value: 'Plataformista', labels: { pt: 'Plataformista', en: 'Floorhand', es: 'Operario de plataforma' } },
  { value: 'Torrista', labels: { pt: 'Torrista', en: 'Derrickman', es: 'Torrero' } },
  { value: 'Sondador', labels: { pt: 'Sondador', en: 'Driller', es: 'Perforador' } },
  { value: 'Encarregado', labels: { pt: 'Encarregado', en: 'Foreman', es: 'Encargado' } },
  { value: 'Coordenador', labels: { pt: 'Coordenador', en: 'Coordinator', es: 'Coordinador' } },
  { value: 'Téc. operação', labels: { pt: 'Téc. operação', en: 'Operations technician', es: 'Técnico de operación' } },
  { value: 'Operador', labels: { pt: 'Operador', en: 'Operator', es: 'Operador' } },
  { value: 'Engenheiro', labels: { pt: 'Engenheiro', en: 'Engineer', es: 'Ingeniero' } },
  { value: 'Supervisor', labels: { pt: 'Supervisor', en: 'Supervisor', es: 'Supervisor' } },
  { value: 'Outro', labels: { pt: 'Outro', en: 'Other', es: 'Otro' } }
];

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

function formatCpf(value = '') {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpf(value = '') {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (length) => {
    const sum = cpf
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const result = (sum * 10) % 11;

    return result === 10 ? 0 : result;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

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

export default function Register() {
  const [language, setLanguage] = useState('pt');
  const [form, setForm] = useState(initialForm);
  const [companies, setCompanies] = useState([]);
  const [existingStudent, setExistingStudent] = useState(null);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [cpfTouched, setCpfTouched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const { register } = useAuth();
  const t = copy[language];

  const languageIndex = useMemo(() => languages.findIndex((item) => item.code === language), [language]);
  const cpfDigits = useMemo(() => onlyDigits(form.cpf), [form.cpf]);
  const cpfError = useMemo(() => {
    if (!cpfTouched || !form.cpf) return '';
    if (cpfDigits.length !== 11) return t.cpfIncomplete;
    return isValidCpf(form.cpf) ? '' : t.cpfInvalid;
  }, [cpfDigits.length, cpfTouched, form.cpf, t.cpfIncomplete, t.cpfInvalid]);

  useEffect(() => {
    api
      .get('/public/companies')
      .then((response) => setCompanies(response.data))
      .catch((err) => setError(getApiError(err)));
  }, []);

  useEffect(() => {
    if (cpfDigits.length !== 11 || !isValidCpf(form.cpf)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      checkExistingRegistration(form.cpf);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [cpfDigits, form.cpf]);

  function formFromStudent(student) {
    return {
      nome_completo: student.nome_completo || '',
      data_nascimento: student.data_nascimento || '',
      telefone: student.telefone || '',
      cpf: formatCpf(student.cpf || ''),
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

  async function checkExistingRegistration(cpf) {
    if (existingStudent && onlyDigits(existingStudent.cpf) === onlyDigits(cpf)) return;

    setCheckingExisting(true);
    try {
      const { data } = await api.post('/auth/register/lookup', { cpf });
      if (data.exists) {
        setExistingStudent(data.student);
        setForm(formFromStudent(data.student));
        setShowExistingModal(true);
      }
    } catch {
      // A valid CPF can still be new; keep the normal flow quiet.
    } finally {
      setCheckingExisting(false);
    }
  }

  function update(field, value) {
    setForm((current) => {
      if (field === 'cpf') {
        const nextCpf = formatCpf(value);
        if (onlyDigits(nextCpf) !== onlyDigits(current.cpf)) {
          setExistingStudent(null);
          setShowExistingModal(false);
        }
        return { ...current, cpf: nextCpf };
      }

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

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidCpf(form.cpf)) {
      setCpfTouched(true);
      setError(cpfDigits.length === 11 ? t.cpfInvalid : t.cpfIncomplete);
      return;
    }

    setLoading(true);

    try {
      if (existingStudent) {
        await api.put('/auth/register/complete', form);
      } else {
        await register(form);
      }
      setForm(initialForm);
      setExistingStudent(null);
      setShowExistingModal(false);
      setCpfTouched(false);
      setSuccess(existingStudent ? 'Cadastro atualizado com sucesso.' : 'Cadastro de aluno enviado com sucesso.');
    } catch (err) {
      if (err?.response?.data?.code === 'STUDENT_ALREADY_EXISTS') {
        await checkExistingRegistration(form.cpf);
      } else {
        setError(getApiError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <SwcLogo />
      </header>

      <main className="public-content">
        <section className="registration-panel">
          <div className="section-heading">
            <span>{t.eyebrow}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>

          <div className="language-switch" style={{ '--active-index': languageIndex }}>
            <Languages size={18} />
            <div className="language-track">
              <span className="language-thumb" />
              {languages.map((item) => (
                <button key={item.code} type="button" className={language === item.code ? 'active' : ''} onClick={() => setLanguage(item.code)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {showExistingModal ? (
            <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="existing-registration-title">
              <div className="modal-card">
                <div className="panel-heading">
                  <h2 id="existing-registration-title">{t.existingTitle}</h2>
                </div>
                <p>{t.existingMessage}</p>
                <div className="form-actions">
                  <button className="primary-button" type="button" onClick={() => setShowExistingModal(false)}>
                    {t.existingAction}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <Field label={t.fullName}>
              <input value={form.nome_completo} onChange={(event) => update('nome_completo', event.target.value)} required />
            </Field>
            <Field label={t.birthDate}>
              <input type="date" value={form.data_nascimento} onChange={(event) => update('data_nascimento', event.target.value)} required />
            </Field>
            <Field label={t.phone}>
              <input value={form.telefone} onChange={(event) => update('telefone', event.target.value)} required />
            </Field>
            <Field label={t.cpf}>
              <input
                className={cpfError ? 'input-error' : ''}
                value={form.cpf}
                onBlur={() => setCpfTouched(true)}
                onChange={(event) => update('cpf', event.target.value)}
                inputMode="numeric"
                maxLength={14}
                required
              />
              {cpfError ? <small className="field-error">{cpfError}</small> : null}
            </Field>
            <Field label={t.email}>
              <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
            </Field>
            <Field label={t.sex}>
              <select value={form.sexo} onChange={(event) => update('sexo', event.target.value)} required>
                {sexOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.labels[language]}
                  </option>
                ))}
              </select>
            </Field>
            {form.sexo === 'Outro' ? (
              <Field label={t.otherSex}>
                <input value={form.sexo_outro} onChange={(event) => update('sexo_outro', event.target.value)} required />
              </Field>
            ) : null}

            <Field label={t.zip}>
              <input value={form.cep} onChange={(event) => update('cep', event.target.value)} required />
            </Field>
            <Field label={t.street}>
              <input value={form.rua} onChange={(event) => update('rua', event.target.value)} required />
            </Field>
            <Field label={t.district}>
              <input value={form.bairro} onChange={(event) => update('bairro', event.target.value)} required />
            </Field>
            <Field label={t.number}>
              <input value={form.numero} onChange={(event) => update('numero', event.target.value)} required />
            </Field>
            <Field label={t.city}>
              <input value={form.cidade} onChange={(event) => update('cidade', event.target.value)} required />
            </Field>
            <Field label={t.state}>
              <input value={form.estado} onChange={(event) => update('estado', event.target.value)} required />
            </Field>

            <Field label={t.responsible}>
              <select value={form.responsavel_inscricao} onChange={(event) => update('responsavel_inscricao', event.target.value)} required>
                <option value="Particular">{t.personal}</option>
                <option value="Empresa">{t.companyResponsible}</option>
              </select>
            </Field>
            {form.responsavel_inscricao === 'Empresa' ? (
              <Field label={t.company}>
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

            <Field label={t.unit}>
              <input value={form.sonda_unidade} onChange={(event) => update('sonda_unidade', event.target.value)} required />
            </Field>
            <Field label={t.operation}>
              <select value={form.operacao} onChange={(event) => update('operacao', event.target.value)} required>
                {operationOptions.map((operation) => (
                  <option key={operation.value} value={operation.value}>
                    {operation.labels[language]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.role}>
              <select value={form.funcao} onChange={(event) => update('funcao', event.target.value)} required>
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.labels[language]}
                  </option>
                ))}
              </select>
            </Field>
            {form.funcao === 'Outro' ? (
              <Field label={t.otherRole}>
                <input value={form.funcao_outro} onChange={(event) => update('funcao_outro', event.target.value)} required />
              </Field>
            ) : null}

            {error ? <div className="alert error form-wide">{error}</div> : null}
            {success ? <div className="alert success form-wide">{success}</div> : null}
            {checkingExisting ? <div className="alert success form-wide">Verificando cadastro existente...</div> : null}

            <div className="form-actions form-wide">
              <button className="primary-button" type="submit" disabled={loading || checkingExisting}>
                {loading ? t.sending : existingStudent ? t.completeRegistration : t.submit}
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
