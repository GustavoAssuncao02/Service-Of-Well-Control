import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Cake,
  ClipboardCheck,
  FileSearch,
  Folder,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Monitor,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  UserCheck,
  UserCog,
  X
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AccessRequestsLoginToast from './AccessRequestsLoginToast.jsx';
import BirthdayLoginToast from './BirthdayLoginToast.jsx';
import SwcLogo from './SwcLogo.jsx';

const navItems = [
  { to: '/admin/area-usuario', label: 'Area do usuario', icon: Folder },
  { to: '/admin', label: 'Calendário', icon: CalendarDays },
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/alunos', label: 'Alunos', icon: Users },
  { to: '/admin/documentos', label: 'Consultar documentos', icon: FileSearch },
  { to: '/admin/instrutores', label: 'Instrutores', icon: GraduationCap },
  { to: '/admin/cursos-turmas', label: 'Cursos e turmas', icon: BookOpen },
  { to: '/admin/modalidades-aula', label: 'Modalidades de aula', icon: Monitor },
  { to: '/admin/controle-avaliacoes', label: 'Controle', icon: ClipboardCheck },
  { to: '/admin/aniversariantes', label: 'Aniversariantes', icon: Cake },
  { to: '/admin/historico', label: 'Histórico', icon: History },
  { to: '/admin/solicitacoes', label: 'Solicitações', icon: UserCheck },
  { to: '/admin/usuarios', label: 'Usuários', icon: UserCog },
  { to: '/admin/relatorio-avaliacoes', label: 'Relatorio de avaliacoes', icon: BarChart3 },
  { to: '/admin/relatorio-turmas', label: 'Relatorio de turmas', icon: BarChart3 },
  { to: '/admin/relatorio-alunos', label: 'Relatorio de alunos', icon: BarChart3 }
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className={`shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <SwcLogo />
        </div>

        <button
          className="sidebar-menu-toggle"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Mostrar menu lateral' : 'Recolher menu lateral'}
          title={collapsed ? 'Mostrar menu lateral' : 'Recolher menu lateral'}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>

        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin'} onClick={() => setOpen(false)} title={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            <button className="icon-button mobile-only" type="button" onClick={() => setOpen((value) => !value)} aria-label="Menu">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <strong>Service Of WellControl</strong>
              <span>Painel administrativo</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="user-chip" type="button" onClick={() => navigate('/admin/perfil')}>
              <Users size={16} />
              {user?.nome}
            </button>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
        <div className="login-toast-stack">
          <AccessRequestsLoginToast />
          <BirthdayLoginToast />
        </div>
      </div>
    </div>
  );
}
