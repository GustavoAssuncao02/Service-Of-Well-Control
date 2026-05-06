export function formatDate(date) {
  if (!date) return '-';
  const [year, month, day] = String(date).split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthIso() {
  return new Date().toISOString().slice(0, 7);
}
