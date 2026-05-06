import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiError } from '../api/client.js';
import SwcLogo from '../components/SwcLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/admin', { replace: true });
    }
  }, [navigate, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'admin' ? '/admin' : '/aluno');
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
          <span>Acesso seguro</span>
          <h1>Entrar no sistema</h1>
          <p>Use email e senha para acessar as áreas protegidas.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <div className="input-icon">
              <UserRound size={18} />
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Senha</span>
            <div className="input-icon">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>
          </label>

          {error ? <div className="alert error">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links">
          <Link to="/cadastro">Cadastro de aluno</Link>
          <Link to="/solicitar-acesso">Solicitar acesso admin</Link>
        </div>
      </section>
    </div>
  );
}
