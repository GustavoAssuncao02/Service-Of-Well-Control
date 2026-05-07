import { formatDate } from './date.js';
import { downloadPdfCommandPagesAsPng } from './pngReport.js';

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const margin = 32;
const contentWidth = PAGE_WIDTH - margin * 2;

function formatNumber(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toFixed(decimals);
}

const criteriaQuestions = [
  'Conteudo apresentado',
  'Aplicabilidade',
  'Conhecimento do instrutor',
  'Desempenho do instrutor',
  'Estimulo a participacao',
  'Esclarecimento de duvidas',
  'Materiais utilizados',
  'Infraestrutura',
  'Carga horaria',
  'Participacao e interesse',
  'Pontualidade',
  'Cumprimento de tarefas',
  'Interacao',
  'Aprendizado'
];

function criteriaLabel(index) {
  return `${index + 1}. ${criteriaQuestions[index]}`;
}

export const evaluationReportColumns = [
  { key: 'id', label: 'ID', getValue: (evaluation) => evaluation.id },
  { key: 'aluno_nome', label: 'Aluno', getValue: (evaluation) => evaluation.aluno_nome },
  { key: 'cpf', label: 'CPF', getValue: (evaluation) => evaluation.cpf },
  { key: 'aluno_email', label: 'Email', getValue: (evaluation) => evaluation.aluno_email },
  { key: 'aluno_telefone', label: 'Telefone', getValue: (evaluation) => evaluation.aluno_telefone },
  { key: 'empresa', label: 'Empresa', getValue: (evaluation) => evaluation.empresa },
  { key: 'cidade', label: 'Cidade', getValue: (evaluation) => evaluation.cidade },
  { key: 'estado', label: 'Estado', getValue: (evaluation) => evaluation.estado },
  { key: 'curso_nome', label: 'Curso', getValue: (evaluation) => evaluation.curso_nome },
  { key: 'classificacao_nome', label: 'Classificacao', getValue: (evaluation) => evaluation.classificacao_nome },
  { key: 'instrutor_nome', label: 'Instrutor', getValue: (evaluation) => evaluation.instrutor_nome },
  { key: 'turma_id', label: 'Turma ID', getValue: (evaluation) => evaluation.turma_id },
  { key: 'periodo', label: 'Periodo turma', getValue: (evaluation) => `${formatDate(evaluation.data_inicio)} a ${formatDate(evaluation.data_fim)}` },
  { key: 'local', label: 'Local', getValue: (evaluation) => evaluation.local },
  { key: 'sala_online', label: 'Sala online', getValue: (evaluation) => evaluation.sala_online },
  { key: 'data_avaliacao', label: 'Data avaliacao', getValue: (evaluation) => formatDate(evaluation.data_avaliacao) },
  { key: 'nota_geral', label: 'Nota geral', getValue: (evaluation) => formatNumber(evaluation.nota_geral, 2) },
  { key: 'teste_zoom', label: 'Teste Zoom', getValue: (evaluation) => evaluation.teste_zoom },
  ...Array.from({ length: 14 }, (_, index) => ({
    key: `nota_${index + 1}`,
    label: criteriaLabel(index),
    getValue: (evaluation) => evaluation[`nota_${index + 1}`]
  })),
  { key: 'comentario', label: 'Comentario', getValue: (evaluation) => evaluation.comentario },
  { key: 'data_cadastro', label: 'Cadastro', getValue: (evaluation) => formatDate(evaluation.data_cadastro) }
];

const pdfColumnGroups = [
  {
    title: 'Identificacao',
    columns: [
      { key: 'id', width: 34 },
      { key: 'aluno_nome', width: 164 },
      { key: 'cpf', width: 84 },
      { key: 'curso_nome', width: 156 },
      { key: 'instrutor_nome', width: 126 },
      { key: 'data_avaliacao', width: 76 },
      { key: 'nota_geral', width: 58 },
      { key: 'teste_zoom', width: 70 }
    ]
  },
  {
    title: 'Turma e origem',
    columns: [
      { key: 'aluno_nome', width: 154 },
      { key: 'empresa', width: 120 },
      { key: 'cidade', width: 86 },
      { key: 'estado', width: 50 },
      { key: 'classificacao_nome', width: 108 },
      { key: 'periodo', width: 108 },
      { key: 'local', width: 112 },
      { key: 'sala_online', width: 40 }
    ]
  },
  {
    title: 'Notas por pergunta - parte 1',
    columns: [
      { key: 'aluno_nome', width: 140 },
      { key: 'nota_geral', width: 52 },
      ...Array.from({ length: 4 }, (_, index) => ({ key: `nota_${index + 1}`, width: 145 }))
    ]
  },
  {
    title: 'Notas por pergunta - parte 2',
    columns: [
      { key: 'aluno_nome', width: 140 },
      { key: 'nota_geral', width: 52 },
      ...Array.from({ length: 4 }, (_, index) => ({ key: `nota_${index + 5}`, width: 145 }))
    ]
  },
  {
    title: 'Notas por pergunta - parte 3',
    columns: [
      { key: 'aluno_nome', width: 140 },
      { key: 'nota_geral', width: 52 },
      ...Array.from({ length: 4 }, (_, index) => ({ key: `nota_${index + 9}`, width: 145 }))
    ]
  },
  {
    title: 'Notas por pergunta - parte 4',
    columns: [
      { key: 'aluno_nome', width: 180 },
      { key: 'nota_geral', width: 70 },
      ...Array.from({ length: 2 }, (_, index) => ({ key: `nota_${index + 13}`, width: 200 }))
    ]
  },
  {
    title: 'Comentarios',
    columns: [
      { key: 'aluno_nome', width: 154 },
      { key: 'curso_nome', width: 144 },
      { key: 'instrutor_nome', width: 120 },
      { key: 'nota_geral', width: 58 },
      { key: 'comentario', width: 302 }
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
    ...evaluationReportColumns.find((item) => item.key === column.key),
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

function buildEvaluationsPdfPages(evaluations, summary, filtersSummary = '') {
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
    addText(continued ? 'Relatorio de avaliacoes - continuacao' : 'Relatorio de avaliacoes', margin, y, { size: 16, bold: true });
    addText(`Bloco: ${group.title}`, margin + 300, y, { size: 9, bold: true });
    addText(`Media: ${formatNumber(summary?.media_geral, 2)}`, margin + 610, y, { size: 9, bold: true });
    y -= 18;
    addText(`Total: ${evaluations.length}`, margin, y, { size: 7 });
    if (filtersSummary) {
      addText(`Filtros: ${filtersSummary}`, margin + 90, y, { size: 7 });
    }
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

  function addRow(evaluation, index, columns, group) {
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
      addText(cellText(column.getValue(evaluation), column.width), x + 3, rowY + 8, { size: 6.1 });
      x += column.width;
    });
    y = rowY;
  }

  pdfColumnGroups.forEach((group) => {
    const columns = group.columns.map(getColumnDefinition);
    startPage(group, false);
    addHeader(columns);

    if (evaluations.length) {
      evaluations.forEach((evaluation, index) => addRow(evaluation, index, columns, group));
    } else {
      y -= rowHeight;
      strokeRect(margin, y, contentWidth, rowHeight);
      addText('Nenhuma avaliacao encontrada para os filtros selecionados.', margin + 6, y + 8, { size: 7 });
    }
  });

  pushPage();
  return pages;
}

export function downloadEvaluationsPdf(evaluations, summary, filtersSummary = '') {
  const pages = buildEvaluationsPdfPages(evaluations, summary, filtersSummary);
  const pdf = buildPdf(pages);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `relatorio-avaliacoes-${fileStamp()}.pdf`);
}

export function downloadEvaluationsPng(evaluations, summary, filtersSummary = '') {
  const pages = buildEvaluationsPdfPages(evaluations, summary, filtersSummary);
  downloadPdfCommandPagesAsPng(pages, `relatorio-avaliacoes-${fileStamp()}.png`, { pageWidth: PAGE_WIDTH, pageHeight: PAGE_HEIGHT });
}

export function downloadEvaluationsExcel(evaluations) {
  const header = evaluationReportColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const rows = evaluations
    .map(
      (evaluation) =>
        `<tr>${evaluationReportColumns
          .map((column) => `<td>${escapeHtml(column.getValue(evaluation))}</td>`)
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

  downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `relatorio-avaliacoes-${fileStamp()}.xls`);
}
