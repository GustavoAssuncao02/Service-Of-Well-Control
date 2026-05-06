export function isVisiblePlace(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized && normalized !== 'n/a');
}

export function isDoneStatus(value) {
  return String(value || '').trim().toLowerCase().startsWith('conclu');
}

export function studentCountLabel(total) {
  const count = Number(total || 0);
  return `${count} ${count === 1 ? 'aluno' : 'alunos'}`;
}

export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
