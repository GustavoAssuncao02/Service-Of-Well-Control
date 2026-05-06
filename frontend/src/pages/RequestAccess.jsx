import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiError } from '../api/client.js';
import SwcLogo from '../components/SwcLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const initialForm = {
  nome: '',
  email: '',
  password: ''
};

export default function RequestAccess() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestAccess } = useAuth();

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await requestAccess(form);
      setForm(initialForm);
      setSuccess('Solicitação enviada. Aguarde a aprovação de um administrador.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <SwcLogo className="auth-logo" />
        <div className="section-heading">
          <span>Acesso ao sistema</span>
          <h1>Solicitar usuário admin</h1>
          <p>Crie sua solicitação. O acesso só será liberado após aprovação de um administrador.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nome</span>
            <div className="input-icon">
              <UserRound size={18} />
              <input value={form.nome} onChange={(event) => update('nome', event.target.value)} required />
            </div>
          </label>

          <label className="field">
            <span>Email</span>
            <div className="input-icon">
              <UserRound size={18} />
              <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
            </div>
          </label>

          <label className="field">
            <span>Senha</span>
            <div className="input-icon">
              <LockKeyhole size={18} />
              <input type="password" minLength={6} value={form.password} onChange={(event) => update('password', event.target.value)} required />
            </div>
          </label>

          {error ? <div className="alert error">{error}</div> : null}
          {success ? <div className="alert success">{success}</div> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Solicitar acesso'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Voltar ao login</Link>
        </div>
      </section>
    </div>
  );
}
