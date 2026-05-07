import { formatDate } from './date.js';
import { downloadPdfCommandPagesAsPng } from './pngReport.js';

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
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

  function pushPage() {
    if (commands.length) pages.push(commands.join('\n'));
  }

  function startPage(continued = false) {
    pushPage();
    commands = [];
    y = PAGE_HEIGHT - margin;
    fillRect(margin, y - 48, contentWidth, 48, '0.9 0.94 0.99');
    strokeRect(margin, y - 48, contentWidth, 48);
    addText('SWC - Service Of WellControl', margin + 12, y - 18, { size: 12, bold: true });
    addText(continued ? 'Avaliacao de reacao - continuacao' : 'Avaliacao de reacao', margin + 12, y - 35, { size: 9, bold: true });
    addText(`Nota geral: ${plainText(evaluation.nota_geral)}/10`, margin + 616, y - 18, { size: 9, bold: true });
    addText(`Data: ${formatDate(evaluation.data_avaliacao)}`, margin + 616, y - 35, { size: 7 });
    y -= 60;
  }

  function addInfo(label, value, x, width, maxLines = 3) {
    addText(label, x, y, { size: 6.2, bold: true });
    const lines = wrapText(value, Math.max(12, Math.floor(width / 4.2))).slice(0, maxLines);
    const lineHeight = lines.length > 2 ? 6.6 : 8;
    const fontSize = lines.length > 2 ? 5.5 : 6.3;
    lines.forEach((line, index) => {
      addText(line, x, y - 8.5 - index * lineHeight, { size: fontSize });
    });
  }

  function addInfoBlock() {
    const blockHeight = 96;
    fillRect(margin, y - blockHeight, contentWidth, blockHeight, '0.98 0.99 1');
    strokeRect(margin, y - blockHeight, contentWidth, blockHeight);

    addInfo('Aluno', evaluation.aluno_nome, margin + 12, 238);
    addInfo('CPF', evaluation.cpf, margin + 266, 92);
    addInfo('Email', evaluation.aluno_email, margin + 374, 242);
    addInfo('Telefone', evaluation.aluno_telefone, margin + 632, 116);

    y -= 30;
    addInfo('Empresa', evaluation.empresa || 'Particular', margin + 12, 258);
    addInfo('Curso', evaluation.curso_nome, margin + 286, 170);
    addInfo('Classificacao', evaluation.classificacao_nome, margin + 472, 124);
    addInfo('Instrutor', evaluation.instrutor_nome, margin + 612, 136);

    y -= 30;
    addInfo('Periodo', `${formatDate(evaluation.data_inicio)} a ${formatDate(evaluation.data_fim)}`, margin + 12, 154);
    addInfo('Local / sala online', `${evaluation.local || '-'} / ${evaluation.sala_online || '-'}`, margin + 182, 246);
    addInfo('Cidade / UF', `${evaluation.cidade || '-'} / ${evaluation.estado || '-'}`, margin + 444, 132);
    addInfo('Status da turma', evaluation.turma_status, margin + 592, 156);

    y -= 36;
  }

  function addCriteriaHeader() {
    fillRect(margin, y - 18, contentWidth, 18, '0.9 0.94 0.99');
    strokeRect(margin, y - 18, 38, 18);
    strokeRect(margin + 38, y - 18, 640, 18);
    strokeRect(margin + 678, y - 18, 92, 18);
    addText('#', margin + 12, y - 11, { size: 6.3, bold: true });
    addText('Criterio avaliado', margin + 48, y - 11, { size: 6.3, bold: true });
    addText('Nota', margin + 710, y - 11, { size: 6.3, bold: true });
    y -= 18;
  }

  function addCriteriaRow(label, value, index) {
    const rowHeight = 16;
    if (index % 2 === 1) fillRect(margin, y - rowHeight, contentWidth, rowHeight, '0.98 0.99 1');
    strokeRect(margin, y - rowHeight, 38, rowHeight);
    strokeRect(margin + 38, y - rowHeight, 640, rowHeight);
    strokeRect(margin + 678, y - rowHeight, 92, rowHeight);
    addText(String(index + 1), margin + 12, y - 10, { size: 6.3 });
    addText(label, margin + 48, y - 10, { size: 6.3 });
    addText(plainText(value), margin + 712, y - 10, { size: 6.3, bold: true });
    y -= rowHeight;
  }

  startPage(false);
  addInfoBlock();
  addText('Avaliacao de reacao', margin, y, { size: 9, bold: true });
  y -= 10;
  addCriteriaHeader();
  reactionCriteriaLabels.forEach((label, index) => addCriteriaRow(label, evaluation[`nota_${index + 1}`], index));

  y -= 8;
  addText(`Teste Zoom: ${evaluation.teste_zoom || '-'}`, margin, y, { size: 7, bold: true });
  y -= 12;
  addText('Comentario', margin, y, { size: 7, bold: true });
  y -= 10;
  const commentLines = wrapText(evaluation.comentario || 'Sem comentario.', 138);
  const availableHeight = Math.max(18, y - margin);
  const lineHeight = Math.max(5.4, Math.min(8.2, availableHeight / commentLines.length));
  const fontSize = Math.max(4.8, Math.min(6.5, lineHeight - 1));
  commentLines.forEach((line) => {
    addText(line, margin, y, { size: fontSize });
    y -= lineHeight;
  });

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
