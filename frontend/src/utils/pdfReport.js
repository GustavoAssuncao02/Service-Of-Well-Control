import { formatDate } from './date.js';
import { isVisiblePlace } from './display.js';

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

function plainText(value) {
  return String(value || '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
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

function wrapText(value, maxLength = 86) {
  const words = plainText(value).split(/\s+/).filter(Boolean);
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

export function downloadClassReport(turma) {
  const pages = [];
  let commands = [];
  let y = PAGE_HEIGHT - 36;
  const margin = 36;
  const contentWidth = PAGE_WIDTH - margin * 2;
  const rowHeight = 24;
  const headerHeight = 24;
  const columns = [
    { label: '#', width: 24, getValue: (_student, index) => String(index + 1) },
    { label: 'Nome', width: 160, getValue: (student) => student.nome_completo },
    { label: 'Telefone', width: 88, getValue: (student) => student.telefone },
    { label: 'Email', width: 160, getValue: (student) => student.email },
    { label: 'Empresa', width: 102, getValue: (student) => student.empresa_nome || student.empresa || student.responsavel_inscricao },
    { label: 'Funcao', width: 94, getValue: (student) => (student.funcao === 'Outro' ? student.funcao_outro : student.funcao) },
    { label: 'Operacao', width: 82, getValue: (student) => student.operacao },
    { label: 'Status', width: 60, getValue: (student) => student.status_turma }
  ];

  function pushPage() {
    if (commands.length) {
      pages.push(commands.join('\n'));
    }
  }

  function startPage(continued = false) {
    pushPage();
    commands = [];
    y = PAGE_HEIGHT - margin;
    addText(continued ? 'Relatorio da turma - continuacao' : 'Relatorio da turma', margin, y, { size: 16, bold: true });
    y -= 22;
    addText(`Curso: ${turma.curso_nome || '-'}`, margin, y, { size: 9, bold: true });
    addText(`Periodo: ${formatDate(turma.data_inicio)} a ${formatDate(turma.data_fim)}`, margin + 430, y, { size: 9 });
    y -= 18;
  }

  function addText(text, x, textY, options = {}) {
    const { size = 8, bold = false } = options;
    const font = bold ? 'F2' : 'F1';
    commands.push(`BT /${font} ${size} Tf ${x} ${textY} Td (${escapePdfText(text)}) Tj ET`);
  }

  function fillRect(x, rectY, width, height, color = '0.94 0.97 1') {
    commands.push(`q ${color} rg ${x} ${rectY} ${width} ${height} re f Q`);
  }

  function strokeRect(x, rectY, width, height) {
    commands.push(`q 0.74 G 0.6 w ${x} ${rectY} ${width} ${height} re S Q`);
  }

  function maxCharacters(width, size = 7) {
    return Math.max(4, Math.floor((width - 8) / (size * 0.52)));
  }

  function cellText(value, width, size = 7) {
    const text = plainText(value);
    const max = maxCharacters(width, size);
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(1, max - 3))}...`;
  }

  function addTableHeader() {
    const headerY = y - headerHeight;
    fillRect(margin, headerY, contentWidth, headerHeight, '0.9 0.94 0.99');
    let x = margin;
    columns.forEach((column) => {
      strokeRect(x, headerY, column.width, headerHeight);
      addText(column.label, x + 4, headerY + 9, { size: 7, bold: true });
      x += column.width;
    });
    y = headerY;
  }

  function addStudentRow(student, index, turma) {
    if (y - rowHeight < margin + 20) {
      startPage(true);
      addCourseHeader(turma);
      addTableHeader();
    }

    const rowY = y - rowHeight;
    if (index % 2 === 1) {
      fillRect(margin, rowY, contentWidth, rowHeight, '0.98 0.99 1');
    }

    let x = margin;
    columns.forEach((column) => {
      strokeRect(x, rowY, column.width, rowHeight);
      addText(cellText(column.getValue(student, index), column.width), x + 4, rowY + 9, { size: 7 });
      x += column.width;
    });

    y = rowY;
  }

  startPage(false);
  addText(`Tipo de curso: ${turma.classificacao_nome || '-'}`, margin, y, { size: 8 });
  addText(`Instrutor: ${turma.instrutor_nome || '-'}`, margin + 250, y, { size: 8 });
  addText(`Total de alunos: ${turma.alunos?.length || 0}`, margin + 540, y, { size: 8 });
  y -= 15;
  addText(`Sala presencial: ${isVisiblePlace(turma.local) ? turma.local : '-'}`, margin, y, { size: 8 });
  addText(`Sala online: ${isVisiblePlace(turma.sala_online) ? turma.sala_online : '-'}`, margin + 380, y, { size: 8 });
  y -= 24;

  addText('Integrantes', margin, y, { size: 11, bold: true });
  y -= 12;
  addTableHeader();

  if (turma.alunos?.length) {
    turma.alunos.forEach((student, index) => addStudentRow(student, index));
  } else {
    y -= rowHeight;
    strokeRect(margin, y, contentWidth, rowHeight);
    addText('Nenhum aluno vinculado a turma.', margin + 8, y + 9, { size: 8 });
  }

  if (y < margin + 24) {
    startPage(true);
  }
  addText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, margin, { size: 7 });
  pushPage();

  const fileSlug = slugText(turma.curso_nome || `turma-${turma.id}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'turma';
  const pdf = buildPdf(pages);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `relatorio-${fileSlug}.pdf`);
}

export function downloadDayClassesReport(dayIso, classes = []) {
  const pages = [];
  let commands = [];
  let y = PAGE_HEIGHT - 36;
  const margin = 36;
  const contentWidth = PAGE_WIDTH - margin * 2;
  const rowHeight = 24;
  const headerHeight = 24;
  const columns = [
    { label: '#', width: 24, getValue: (_student, index) => String(index + 1) },
    { label: 'Nome', width: 160, getValue: (student) => student.nome_completo },
    { label: 'Telefone', width: 88, getValue: (student) => student.telefone },
    { label: 'Email', width: 160, getValue: (student) => student.email },
    { label: 'Empresa', width: 102, getValue: (student) => student.empresa_nome || student.empresa || student.responsavel_inscricao },
    { label: 'Funcao', width: 94, getValue: (student) => (student.funcao === 'Outro' ? student.funcao_outro : student.funcao) },
    { label: 'Operacao', width: 82, getValue: (student) => student.operacao },
    { label: 'Status', width: 60, getValue: (student) => student.status_turma }
  ];

  function pushPage() {
    if (commands.length) {
      pages.push(commands.join('\n'));
    }
  }

  function addText(text, x, textY, options = {}) {
    const { size = 8, bold = false } = options;
    const font = bold ? 'F2' : 'F1';
    commands.push(`BT /${font} ${size} Tf ${x} ${textY} Td (${escapePdfText(text)}) Tj ET`);
  }

  function fillRect(x, rectY, width, height, color = '0.94 0.97 1') {
    commands.push(`q ${color} rg ${x} ${rectY} ${width} ${height} re f Q`);
  }

  function strokeRect(x, rectY, width, height) {
    commands.push(`q 0.74 G 0.6 w ${x} ${rectY} ${width} ${height} re S Q`);
  }

  function maxCharacters(width, size = 7) {
    return Math.max(4, Math.floor((width - 8) / (size * 0.52)));
  }

  function cellText(value, width, size = 7) {
    const text = plainText(value);
    const max = maxCharacters(width, size);
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(1, max - 3))}...`;
  }

  function startPage(continued = false) {
    pushPage();
    commands = [];
    y = PAGE_HEIGHT - margin;
    addText(continued ? 'Relatorio de cursos do dia - continuacao' : 'Relatorio de cursos do dia', margin, y, { size: 16, bold: true });
    y -= 22;
    addText(`Data selecionada: ${formatDate(dayIso)}`, margin, y, { size: 9, bold: true });
    addText(`Total de cursos: ${classes.length}`, margin + 250, y, { size: 9 });
    addText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin + 500, y, { size: 9 });
    y -= 24;
  }

  function addTableHeader() {
    const headerY = y - headerHeight;
    fillRect(margin, headerY, contentWidth, headerHeight, '0.9 0.94 0.99');
    let x = margin;
    columns.forEach((column) => {
      strokeRect(x, headerY, column.width, headerHeight);
      addText(column.label, x + 4, headerY + 9, { size: 7, bold: true });
      x += column.width;
    });
    y = headerY;
  }

  function addCourseHeader(turma) {
    const blockHeight = 56;
    if (y - blockHeight - headerHeight < margin + 20) {
      startPage(true);
    }

    const headerY = y - blockHeight;
    fillRect(margin, headerY, contentWidth, blockHeight, '0.93 0.97 1');
    strokeRect(margin, headerY, contentWidth, blockHeight);
    addText(turma.curso_nome || 'Curso sem nome', margin + 8, headerY + 38, { size: 11, bold: true });
    addText(`Tipo: ${turma.classificacao_nome || '-'}`, margin + 8, headerY + 22, { size: 8 });
    addText(`Instrutor: ${turma.instrutor_nome || '-'}`, margin + 210, headerY + 22, { size: 8 });
    addText(`Periodo: ${formatDate(turma.data_inicio)} a ${formatDate(turma.data_fim)}`, margin + 430, headerY + 22, { size: 8 });
    addText(`Local: ${isVisiblePlace(turma.local) ? turma.local : '-'}`, margin + 8, headerY + 8, { size: 8 });
    addText(`Sala online: ${isVisiblePlace(turma.sala_online) ? turma.sala_online : '-'}`, margin + 280, headerY + 8, { size: 8 });
    addText(`Alunos: ${turma.alunos?.length || 0}`, margin + 560, headerY + 8, { size: 8 });
    y = headerY - 8;
  }

  function addStudentRow(student, index) {
    if (y - rowHeight < margin + 20) {
      startPage(true);
      addTableHeader();
    }

    const rowY = y - rowHeight;
    if (index % 2 === 1) {
      fillRect(margin, rowY, contentWidth, rowHeight, '0.98 0.99 1');
    }

    let x = margin;
    columns.forEach((column) => {
      strokeRect(x, rowY, column.width, rowHeight);
      addText(cellText(column.getValue(student, index), column.width), x + 4, rowY + 9, { size: 7 });
      x += column.width;
    });

    y = rowY;
  }

  startPage(false);

  if (classes.length) {
    classes.forEach((turma) => {
      addCourseHeader(turma);
      addTableHeader();

      if (turma.alunos?.length) {
        turma.alunos.forEach((student, index) => addStudentRow(student, index, turma));
      } else {
        y -= rowHeight;
        strokeRect(margin, y, contentWidth, rowHeight);
        addText('Nenhum aluno vinculado a esta turma.', margin + 8, y + 9, { size: 8 });
      }

      y -= 18;
    });
  } else {
    y -= rowHeight;
    strokeRect(margin, y, contentWidth, rowHeight);
    addText('Nenhum curso encontrado para a data selecionada.', margin + 8, y + 10, { size: 8 });
  }

  pushPage();

  const fileSlug = slugText(`cursos-${dayIso}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cursos-do-dia';
  const pdf = buildPdf(pages);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `relatorio-${fileSlug}.pdf`);
}
