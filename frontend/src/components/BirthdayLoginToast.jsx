import { Cake, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function localDateParts() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = date.getDate();

  return {
    day,
    monthKey: `${year}-${month}`,
    dateKey: `${year}-${month}-${String(day).padStart(2, '0')}`
  };
}

function birthdayCountText(count) {
  return count === 1 ? '1 aniversariante hoje' : `${count} aniversariantes hoje`;
}

export default function BirthdayLoginToast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [birthdayCount, setBirthdayCount] = useState(0);
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
    const { day, monthKey, dateKey } = localDateParts();
    const userId = user?.id;

    async function loadTodayBirthdays() {
      if (!userId || user?.role !== 'admin') return;
      if (location.pathname === '/admin/aniversariantes') return;

      const loginKey = `swc_login_day_${userId}`;
      const seenKey = `swc_birthday_notice_seen_${userId}_${dateKey}`;

      if (localStorage.getItem(loginKey) !== dateKey || localStorage.getItem(seenKey) === 'yes') return;

      const { data } = await api.get('/students/birthdays', { params: { month: monthKey } });
      if (cancelled) return;

      const todayCount = data.filter((student) => Number(student.dia) === day).length;
      if (!todayCount) return;

      localStorage.setItem(seenKey, 'yes');
      setBirthdayCount(todayCount);
      setLeaving(false);

      hideTimer.current = setTimeout(() => {
        dismiss();
      }, 12000);
    }

    loadTodayBirthdays().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (location.pathname === '/admin/aniversariantes') {
      setBirthdayCount(0);
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
      setBirthdayCount(0);
      setLeaving(false);
      exitTimer.current = null;
    }, 360);
  }

  function openBirthdaysPage() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setBirthdayCount(0);
    navigate('/admin/aniversariantes');
  }

  if (!birthdayCount) return null;

  return (
    <aside className={`birthday-toast ${leaving ? 'is-leaving' : ''}`} aria-live="polite">
      <button className="birthday-toast-content" type="button" onClick={openBirthdaysPage}>
        <span className="birthday-toast-icon">
          <Cake size={22} />
        </span>
        <span>
          <strong>{birthdayCountText(birthdayCount)}</strong>
          <small>Abra a lista de aniversariantes para enviar a mensagem.</small>
        </span>
      </button>
      <button className="birthday-toast-close" type="button" onClick={dismiss} aria-label="Fechar notificacao">
        <X size={16} />
      </button>
    </aside>
  );
}
