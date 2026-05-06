import { formatDate } from './date.js';

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const margin = 32;
const contentWidth = PAGE_WIDTH - margin * 2;

function formatNumber(value, decimals = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toFixed(decimals);
}

function formatPercent(value) {
  return `${formatNumber(value, 1)}%`;
}

export const classReportColumns = [
  { key: 'id', label: 'ID', getValue: (turma) => turma.id },
  { key: 'curso_nome', label: 'Curso', getValue: (turma) => turma.curso_nome },
  { key: 'classificacao_nome', label: 'Classificacao', getValue: (turma) => turma.classificacao_nome },
  { key: 'instrutor_nome', label: 'Instrutor', getValue: (turma) => turma.instrutor_nome },
  { key: 'data_inicio', label: 'Inicio', getValue: (turma) => formatDate(turma.data_inicio) },
  { key: 'data_fim', label: 'Fim', getValue: (turma) => formatDate(turma.data_fim) },
  { key: 'local', label: 'Local', getValue: (turma) => turma.local },
  { key: 'sala_online', label: 'Sala online', getValue: (turma) => turma.sala_online },
  { key: 'status', label: 'Status', getValue: (turma) => turma.status },
  { key: 'observacao', label: 'Observacao', getValue: (turma) => turma.observacao },
  { key: 'data_cadastro', label: 'Cadastro', getValue: (turma) => formatDate(turma.data_cadastro) },
  { key: 'data_atualizacao', label: 'Atualizacao', getValue: (turma) => formatDate(turma.data_atualizacao) },
  { key: 'total_alunos', label: 'Total alunos', getValue: (turma) => turma.total_alunos },
  { key: 'alunos_concluidos', label: 'Alunos concluidos', getValue: (turma) => turma.alunos_concluidos },
  { key: 'alunos_em_andamento', label: 'Alunos em andamento', getValue: (turma) => turma.alunos_em_andamento },
  { key: 'avaliacoes_recebidas', label: 'Avaliacoes recebidas', getValue: (turma) => turma.avaliacoes_recebidas },
  { key: 'avaliacoes_pendentes', label: 'Avaliacoes pendentes', getValue: (turma) => turma.avaliacoes_pendentes },
  { key: 'taxa_resposta', label: 'Taxa resposta', getValue: (turma) => formatPercent(turma.taxa_resposta) },
  { key: 'media_geral', label: 'Media geral', getValue: (turma) => (turma.media_geral === null ? '-' : formatNumber(turma.media_geral, 2)) },
  { key: 'menor_nota', label: 'Menor nota', getValue: (turma) => (turma.menor_nota === null ? '-' : formatNumber(turma.menor_nota, 2)) },
  { key: 'maior_nota', label: 'Maior nota', getValue: (turma) => (turma.maior_nota === null ? '-' : formatNumber(turma.maior_nota, 2)) }
];

const pdfColumnGroups = [
  {
    title: 'Identificacao',
    columns: [
      { key: 'id', width: 34 },
      { key: 'curso_nome', width: 190 },
      { key: 'classificacao_nome', width: 110 },
      { key: 'instrutor_nome', width: 126 },
      { key: 'data_inicio', width: 70 },
      { key: 'data_fim', width: 70 },
      { key: 'status', width: 82 },
      { key: 'data_cadastro', width: 70 }
    ]
  },
  {
    title: 'Estrutura',
    columns: [
      { key: 'curso_nome', width: 190 },
      { key: 'instrutor_nome', width: 128 },
      { key: 'local', width: 132 },
      { key: 'sala_online', width: 132 },
      { key: 'observacao', width: 196 }
    ]
  },
  {
    title: 'Participacao e avaliacoes',
    columns: [
      { key: 'curso_nome', width: 172 },
      { key: 'total_alunos', width: 62 },
      { key: 'alunos_concluidos', width: 72 },
      { key: 'alunos_em_andamento', width: 82 },
      { key: 'avaliacoes_recebidas', width: 78 },
      { key: 'avaliacoes_pendentes', width: 78 },
      { key: 'taxa_resposta', width: 72 },
      { key: 'media_geral', width: 62 },
      { key: 'menor_nota', width: 56 },
      { key: 'maior_nota', width: 56 }
    ]
  }
];

function plainText(value) {
  return String(value ?? '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\r\n\t]+/g, ' ')
    .trim() || '-';
}

function slugText(value) {
  return plainText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(value) {
  return [...plainText(value)]
    .map((character) => {
      if (character === '\\') return '\\\\';
      if (character === '(') return '\\(';
      if (character === ')') return '\\)';

      const code = character.charCodeAt(0);
      if (code >= 32 && code <= 126) return character;
      if (code >= 160 && code <= 255) return `\\${code.toString(8).padStart(3, '0')}`;

      return slugText(character) || '';
    })
    .join('');
}

function escapeHtml(value) {
  return plainText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPdf(pages) {
  const objects = [];
  const pageObjectIds = [];
  let objectId = 5;

  pages.forEach((content) => {
    const pageId = objectId++;
    const contentId = objectId++;
    pageObjectIds.push(pageId);
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let index = 1; index < objects.length; index += 1) {
    if (!objects[index]) continue;
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index] || 0).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function getColumnDefinition(column) {
  return {
    ...classReportColumns.find((item) => item.key === column.key),
    ...column
  };
}

function cellText(value, width, size = 6.1) {
  const text = plainText(value);
  const max = Math.max(4, Math.floor((width - 6) / (size * 0.52)));
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 3))}...`;
}

function fileStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function downloadClassesPdf(classes, filtersSummary = '') {
  const pages = [];
  let commands = [];
  let y = PAGE_HEIGHT - margin;
  const rowHeight = 20;
  const headerHeight = 22;

  function addText(text, x, textY, options = {}) {
    const { size = 7, bold = false } = options;
    const font = bold ? 'F2' : 'F1';
    commands.push(`BT /${font} ${size} Tf ${x} ${textY} Td (${escapePdfText(text)}) Tj ET`);
  }

  function fillRect(x, rectY, width, height, color = '0.94 0.97 1') {
    commands.push(`q ${color} rg ${x} ${rectY} ${width} ${height} re f Q`);
  }

  function strokeRect(x, rectY, width, height) {
    commands.push(`q 0.72 G 0.45 w ${x} ${rectY} ${width} ${height} re S Q`);
  }

  function pushPage() {
    if (commands.length) {
      pages.push(commands.join('\n'));
    }
  }

  function startPage(group, continued = false) {
    pushPage();
    commands = [];
    y = PAGE_HEIGHT - margin;
    addText(continued ? 'Relatorio de turmas - continuacao' : 'Relatorio de turmas', margin, y, { size: 16, bold: true });
    addText(`Bloco: ${group.title}`, margin + 300, y, { size: 9, bold: true });
    addText(`Total: ${classes.length}`, margin + 640, y, { size: 9 });
    y -= 18;
    if (filtersSummary) {
      addText(`Filtros: ${filtersSummary}`, margin, y, { size: 7 });
      y -= 14;
    }
    addText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, y, { size: 7 });
    y -= 18;
  }

  function addHeader(columns) {
    const headerY = y - headerHeight;
    fillRect(margin, headerY, contentWidth, headerHeight, '0.9 0.94 0.99');
    let x = margin;
    columns.forEach((column) => {
      strokeRect(x, headerY, column.width, headerHeight);
      addText(column.label, x + 3, headerY + 8, { size: 6, bold: true });
      x += column.width;
    });
    y = headerY;
  }

  function addRow(turma, index, columns, group) {
    if (y - rowHeight < margin + 12) {
      startPage(group, true);
      addHeader(columns);
    }

    const rowY = y - rowHeight;
    if (index % 2 === 1) {
      fillRect(margin, rowY, contentWidth, rowHeight, '0.98 0.99 1');
    }

    let x = margin;
    columns.forEach((column) => {
      strokeRect(x, rowY, column.width, rowHeight);
      addText(cellText(column.getValue(turma), column.width), x + 3, rowY + 8, { size: 6.1 });
      x += column.width;
    });
    y = rowY;
  }

  pdfColumnGroups.forEach((group) => {
    const columns = group.columns.map(getColumnDefinition);
    startPage(group, false);
    addHeader(columns);

    if (classes.length) {
      classes.forEach((turma, index) => addRow(turma, index, columns, group));
    } else {
      y -= rowHeight;
      strokeRect(margin, y, contentWidth, rowHeight);
      addText('Nenhuma turma encontrada para os filtros selecionados.', margin + 6, y + 8, { size: 7 });
    }
  });

  pushPage();
  const pdf = buildPdf(pages);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `relatorio-turmas-${fileStamp()}.pdf`);
}

export function downloadClassesExcel(classes) {
  const header = classReportColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const rows = classes
    .map(
      (turma) =>
        `<tr>${classReportColumns
          .map((column) => `<td>${escapeHtml(column.getValue(turma))}</td>`)
          .join('')}</tr>`
    )
    .join('');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; }
      th, td { border: 1px solid #d0d7e2; padding: 6px; mso-number-format:"\\@"; }
      th { background: #eaf1fb; font-weight: 700; }
    </style>
  </head>
  <body>
    <table>
      <thead><tr>${header}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;

  downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `relatorio-turmas-${fileStamp()}.xls`);
}
