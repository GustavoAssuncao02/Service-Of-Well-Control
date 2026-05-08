import { formatDate } from './date.js';
import { downloadPdfCommandPagesAsPng } from './pngReport.js';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const margin = 36;
const contentWidth = PAGE_WIDTH - margin * 2;

export const reactionCriteriaLabels = [
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

function fileSlug(evaluation) {
  const name = slugText(evaluation.aluno_nome || `avaliacao-${evaluation.id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return name || `avaliacao-${evaluation.id}`;
}

function wrapText(value, maxLength) {
  const words = plainText(value)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      if (word.length <= maxLength) return [word];

      const parts = [];
      for (let index = 0; index < word.length; index += maxLength) {
        parts.push(word.slice(index, index + maxLength));
      }
      return parts;
    });
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (nextLine.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

function buildReactionEvaluationPages(evaluation) {
  const pages = [];
  let commands = [];
  let y = PAGE_HEIGHT - margin;

  function addText(text, x, textY, options = {}) {
    const { size = 8, bold = false } = options;
    const font = bold ? 'F2' : 'F1';
    commands.push(`BT /${font} ${size} Tf ${x} ${textY} Td (${escapePdfText(text)}) Tj ET`);
  }

  function fillRect(x, rectY, width, height, color = '0.94 0.97 1') {
    commands.push(`q ${color} rg ${x} ${rectY} ${width} ${height} re f Q`);
  }

  function strokeRect(x, rectY, width, height) {
    commands.push(`q 0.72 G 0.45 w ${x} ${rectY} ${width} ${height} re S Q`);
  }

  function line(x1, y1, x2, y2, color = '0.84', width = 0.45) {
    commands.push(`q ${color} G ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }

  function pushPage() {
    if (commands.length) pages.push(commands.join('\n'));
  }

  function startPage(continued = false) {
    pushPage();
    commands = [];
    y = PAGE_HEIGHT - margin;
    fillRect(margin, y - 62, contentWidth, 62, '0.91 0.95 1');
    strokeRect(margin, y - 62, contentWidth, 62);
    addText('SWC - Service Of WellControl', margin + 16, y - 20, { size: 15, bold: true });
    addText(continued ? 'Avaliacao de reacao - continuacao' : 'Avaliacao de reacao', margin + 16, y - 40, { size: 10, bold: true });
    addText('Nota geral', margin + contentWidth - 100, y - 18, { size: 8, bold: true });
    addText(`${Number(evaluation.nota_geral || 0).toFixed(2)}/10`, margin + contentWidth - 100, y - 38, { size: 15, bold: true });
    addText(`Data: ${formatDate(evaluation.data_avaliacao)}`, margin + contentWidth - 100, y - 53, { size: 8 });
    y -= 78;
  }

  function addSectionTitle(title) {
    addText(title, margin, y, { size: 12, bold: true });
    line(margin, y - 7, margin + contentWidth, y - 7, '0.78', 0.55);
    y -= 22;
  }

  function wrapForWidth(value, width, size = 8.5) {
    const maxChars = Math.max(8, Math.floor(width / (size * 0.62)));
    return wrapText(value, maxChars);
  }

  function fitLines(value, width, size = 8.5, maxLines = 3) {
    const maxChars = Math.max(8, Math.floor(width / (size * 0.62)));
    const lines = wrapText(value, maxChars);
    const visibleLines = lines.slice(0, maxLines);

    if (lines.length > maxLines) {
      const lastIndex = visibleLines.length - 1;
      const lastLine = visibleLines[lastIndex] || '';
      visibleLines[lastIndex] = `${lastLine.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
    }

    return visibleLines;
  }

  function addField(label, value, x, topY, width) {
    addText(label, x, topY, { size: 7.2, bold: true });
    fitLines(value, width, 8.4, 3).forEach((lineText, index) => {
      addText(lineText, x, topY - 12 - index * 10, { size: 8.4 });
    });
  }

  function addInfoBlock() {
    addSectionTitle('Dados da avaliacao');

    const fields = [
      ['Aluno', evaluation.aluno_nome],
      ['CPF', evaluation.cpf],
      ['Email', evaluation.aluno_email],
      ['Telefone', evaluation.aluno_telefone],
      ['Empresa', evaluation.empresa || 'Particular'],
      ['Curso', evaluation.curso_nome],
      ['Classificacao', evaluation.classificacao_nome],
      ['Instrutor', evaluation.instrutor_nome],
      ['Periodo', `${formatDate(evaluation.data_inicio)} a ${formatDate(evaluation.data_fim)}`],
      ['Local / sala online', `${evaluation.local || '-'} / ${evaluation.sala_online || '-'}`],
      ['Cidade / UF', `${evaluation.cidade || '-'} / ${evaluation.estado || '-'}`],
      ['Status da turma', evaluation.turma_status || '-'],
      ['Teste Zoom', evaluation.teste_zoom || '-']
    ];
    const columns = 2;
    const gap = 16;
    const paddingX = 14;
    const paddingTop = 16;
    const fieldWidth = (contentWidth - paddingX * 2 - gap) / columns;
    const rows = [];

    for (let index = 0; index < fields.length; index += columns) {
      const rowFields = fields.slice(index, index + columns);
      const lineCounts = rowFields.map(([, value]) => fitLines(value, fieldWidth, 8.4, 3).length);
      rows.push({ fields: rowFields, height: Math.max(40, Math.max(...lineCounts) * 10 + 24) });
    }

    const blockHeight = rows.reduce((total, row) => total + row.height, paddingTop + 8);

    fillRect(margin, y - blockHeight, contentWidth, blockHeight, '0.985 0.99 1');
    strokeRect(margin, y - blockHeight, contentWidth, blockHeight);

    let rowY = y - paddingTop;
    rows.forEach((row, rowIndex) => {
      row.fields.forEach(([label, value], column) => {
        const x = margin + paddingX + column * (fieldWidth + gap);
        addField(label, value, x, rowY, fieldWidth);
      });

      if (rowIndex < rows.length - 1) {
        line(margin + paddingX, rowY - row.height + 8, margin + contentWidth - paddingX, rowY - row.height + 8, '0.9', 0.35);
      }
      rowY -= row.height;
    });

    y -= blockHeight + 16;
  }

  function addScoreStrip() {
    const gap = 12;
    const cardWidth = (contentWidth - gap * 2) / 3;
    const cards = [
      ['Nota geral', `${Number(evaluation.nota_geral || 0).toFixed(2)}/10`],
      ['Teste Zoom', evaluation.teste_zoom || '-'],
      ['Data da avaliacao', formatDate(evaluation.data_avaliacao)]
    ];

    cards.forEach(([label, value], index) => {
      const x = margin + index * (cardWidth + gap);
      fillRect(x, y - 48, cardWidth, 48, index === 0 ? '0.9 0.96 0.92' : '0.96 0.98 1');
      strokeRect(x, y - 48, cardWidth, 48);
      addText(label, x + 12, y - 18, { size: 8, bold: true });
      addText(value, x + 12, y - 34, { size: index === 0 ? 12 : 10, bold: true });
    });

    y -= 66;
  }

  function addCriteriaHeader() {
    fillRect(margin, y - 24, contentWidth, 24, '0.91 0.95 1');
    strokeRect(margin, y - 24, 34, 24);
    strokeRect(margin + 34, y - 24, contentWidth - 88, 24);
    strokeRect(margin + contentWidth - 54, y - 24, 54, 24);
    addText('#', margin + 12, y - 15, { size: 8, bold: true });
    addText('Criterio avaliado', margin + 44, y - 15, { size: 8, bold: true });
    addText('Nota', margin + contentWidth - 38, y - 15, { size: 8, bold: true });
    y -= 24;
  }

  function addCriteriaRow(label, value, index) {
    const rowHeight = 20;
    if (index % 2 === 1) fillRect(margin, y - rowHeight, contentWidth, rowHeight, '0.98 0.99 1');
    strokeRect(margin, y - rowHeight, 34, rowHeight);
    strokeRect(margin + 34, y - rowHeight, contentWidth - 88, rowHeight);
    strokeRect(margin + contentWidth - 54, y - rowHeight, 54, rowHeight);
    addText(String(index + 1), margin + 13, y - 13, { size: 8.2 });
    addText(label, margin + 44, y - 13, { size: 8.2 });
    addText(plainText(value), margin + contentWidth - 34, y - 13, { size: 8.2, bold: true });
    y -= rowHeight;
  }

  startPage(false);
  addInfoBlock();
  if (y < margin + 330) startPage(true);
  addSectionTitle('Avaliacao de reacao');
  addCriteriaHeader();
  reactionCriteriaLabels.forEach((label, index) => addCriteriaRow(label, evaluation[`nota_${index + 1}`], index));

  y -= 16;
  if (y < margin + 90) startPage(true);
  addSectionTitle('Comentario');
  const commentLines = wrapForWidth(evaluation.comentario || 'Sem comentario.', contentWidth - 24, 8.8);
  const commentHeight = Math.max(62, commentLines.length * 11 + 22);
  fillRect(margin, y - commentHeight, contentWidth, commentHeight, '0.985 0.99 1');
  strokeRect(margin, y - commentHeight, contentWidth, commentHeight);
  commentLines.forEach((lineText, index) => {
    addText(lineText, margin + 12, y - 18 - index * 11, { size: 8.8 });
  });
  y -= commentHeight;

  pushPage();
  return pages;
}

export function downloadReactionEvaluationPdf(evaluation) {
  const pages = buildReactionEvaluationPages(evaluation);
  const pdf = buildPdf(pages);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `avaliacao-reacao-${fileSlug(evaluation)}.pdf`);
}

export function downloadReactionEvaluationPng(evaluation) {
  const pages = buildReactionEvaluationPages(evaluation);
  downloadPdfCommandPagesAsPng(pages, `avaliacao-reacao-${fileSlug(evaluation)}.png`, { pageWidth: PAGE_WIDTH, pageHeight: PAGE_HEIGHT });
}
