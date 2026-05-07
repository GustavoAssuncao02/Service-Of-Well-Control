import { UserCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function requestCountText(count) {
  return count === 1 ? '1 solicitacao de usuario pendente' : `${count} solicitacoes de usuarios pendentes`;
}

export default function AccessRequestsLoginToast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const hideTimer = useRef(null);
  const exitTimer = useRef(null);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const userId = user?.id;

    async function loadPendingRequests() {
      if (!userId || user?.role !== 'admin') return;
      if (location.pathname === '/admin/solicitacoes') return;

      const loginEventKey = `swc_login_event_${userId}`;
      const loginEvent = localStorage.getItem(loginEventKey);
      if (!loginEvent) return;

      const seenKey = `swc_access_request_notice_seen_${userId}_${loginEvent}`;
      if (localStorage.getItem(seenKey) === 'yes') return;

      const { data } = await api.get('/users', { params: { role: 'pendente' } });
      if (cancelled) return;

      const totalPending = Array.isArray(data) ? data.length : 0;
      if (!totalPending) return;

      localStorage.setItem(seenKey, 'yes');
      setPendingCount(totalPending);
      setLeaving(false);

      hideTimer.current = setTimeout(() => {
        dismiss();
      }, 12000);
    }

    loadPendingRequests().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  useEffect(() => {
    if (location.pathname === '/admin/solicitacoes') {
      setPendingCount(0);
      setLeaving(false);
    }
  }, [location.pathname]);

  function dismiss() {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    setLeaving(true);
    exitTimer.current = setTimeout(() => {
      setPendingCount(0);
      setLeaving(false);
      exitTimer.current = null;
    }, 360);
  }

  function openRequestsPage() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setPendingCount(0);
    navigate('/admin/solicitacoes');
  }

  if (!pendingCount) return null;

  return (
    <aside className={`access-requests-toast ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
      <button className="access-requests-toast-content" type="button" onClick={openRequestsPage}>
        <span className="access-requests-toast-icon">
          <UserCheck size={22} />
        </span>
        <span>
          <strong>{requestCountText(pendingCount)}</strong>
          <small>Clique para revisar as solicitacoes de usuarios.</small>
        </span>
      </button>
      <button className="access-requests-toast-close" type="button" onClick={dismiss} aria-label="Fechar notificacao">
        <X size={16} />
      </button>
    </aside>
  );
}
