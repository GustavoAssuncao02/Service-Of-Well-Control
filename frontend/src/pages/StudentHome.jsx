import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function StudentHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="auth-page">
      <section className="auth-panel wide">
        <img className="auth-logo" src="/swc-logo.svg" alt="SWC" />
        <div className="section-heading">
          <span>Área do aluno</span>
          <h1>Cadastro realizado</h1>
        </div>
        <div className="inline-actions">
          <button className="ghost-button" type="button" onClick={handleLogout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </section>
    </div>
  );
}
