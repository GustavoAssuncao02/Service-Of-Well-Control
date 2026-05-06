import { KeyRound, Save, UserRound } from 'lucide-react';
import { useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { Field } from '../components/Field.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    nome: user?.nome || '',
    email: user?.email || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSavingProfile(true);

    try {
      const data = await updateProfile(profileForm);
      setProfileForm({ nome: data.user.nome, email: data.user.email });
      setSuccess('Perfil atualizado com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('A nova senha e a confirmação precisam ser iguais.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Senha alterada com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Conta</span>
        <h1>Meu perfil</h1>
        <p>Atualize seus dados de acesso ao painel administrativo.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <section className="two-column profile-panels">
        <article className="panel">
          <div className="panel-heading">
            <h2>Dados do usuário</h2>
          </div>
          <form className="stack" onSubmit={saveProfile}>
            <Field label="Nome">
              <input value={profileForm.nome} onChange={(event) => setProfileForm((current) => ({ ...current, nome: event.target.value }))} required />
            </Field>
            <Field label="Email">
              <input type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} required />
            </Field>
            <button className="primary-button" type="submit" disabled={savingProfile}>
              <UserRound size={18} />
              {savingProfile ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Alterar senha</h2>
          </div>
          <form className="stack" onSubmit={savePassword}>
            <Field label="Senha atual">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </Field>
            <Field label="Nova senha">
              <input
                type="password"
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                required
              />
            </Field>
            <Field label="Confirmar nova senha">
              <input
                type="password"
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
            </Field>
            <button className="primary-button" type="submit" disabled={savingPassword}>
              <KeyRound size={18} />
              {savingPassword ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
