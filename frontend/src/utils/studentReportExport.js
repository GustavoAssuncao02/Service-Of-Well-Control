import { formatDate } from './date.js';
import { downloadPdfCommandPagesAsPng } from './pngReport.js';

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const margin = 32;
const contentWidth = PAGE_WIDTH - margin * 2;

export const studentReportColumns = [
  { key: 'id', label: 'ID', getValue: (student) => student.id },
  { key: 'nome_completo', label: 'Nome completo', getValue: (student) => student.nome_completo },
  { key: 'cpf', label: 'CPF', getValue: (student) => student.cpf },
  { key: 'data_nascimento', label: 'Nascimento', getValue: (student) => formatDate(student.data_nascimento) },
  { key: 'telefone', label: 'Telefone', getValue: (student) => student.telefone },
  { key: 'email', label: 'Email', getValue: (student) => student.email },
  { key: 'sexo_descricao', label: 'Sexo', getValue: (student) => student.sexo_descricao || student.sexo },
  { key: 'cep', label: 'CEP', getValue: (student) => student.cep },
  { key: 'rua', label: 'Rua', getValue: (student) => student.rua },
  { key: 'bairro', label: 'Bairro', getValue: (student) => student.bairro },
  { key: 'numero', label: 'Numero', getValue: (student) => student.numero },
  { key: 'cidade', label: 'Cidade', getValue: (student) => student.cidade },
  { key: 'estado', label: 'Estado', getValue: (student) => student.estado },
  { key: 'endereco_completo', label: 'Endereco completo', getValue: (student) => student.endereco_completo },
  { key: 'responsavel_inscricao', label: 'Responsavel inscricao', getValue: (student) => student.responsavel_inscricao },
  { key: 'empresa', label: 'Empresa', getValue: (student) => student.empresa },
  { key: 'sonda_unidade', label: 'Sonda / unidade', getValue: (student) => student.sonda_unidade },
  { key: 'operacao', label: 'Operacao', getValue: (student) => student.operacao },
  { key: 'funcao_descricao', label: 'Funcao', getValue: (student) => student.funcao_descricao || student.funcao },
  { key: 'observacao', label: 'Observacao', getValue: (student) => student.observacao },
  { key: 'data_cadastro', label: 'Cadastro', getValue: (student) => formatDate(student.data_cadastro) },
  { key: 'data_atualizacao', label: 'Atualizacao', getValue: (student) => formatDate(student.data_atualizacao) },
  { key: 'total_turmas', label: 'Total turmas', getValue: (student) => student.total_turmas },
  { key: 'modalidades_aula', label: 'Modalidades de aula', getValue: (student) => student.modalidades_aula || student.classificacoes_presenca },
  { key: 'turmas_presenciais', label: 'Turmas presenciais', getValue: (student) => student.turmas_presenciais },
  { key: 'turmas_online', label: 'Turmas online', getValue: (student) => student.turmas_online },
  { key: 'turmas_concluidas', label: 'Turmas concluidas', getValue: (student) => student.turmas_concluidas },
  { key: 'turmas_em_andamento', label: 'Turmas em andamento', getValue: (student) => student.turmas_em_andamento },
  { key: 'primeira_turma', label: 'Primeira turma', getValue: (student) => formatDate(student.primeira_turma) },
  { key: 'ultima_turma', label: 'Ultima turma', getValue: (student) => formatDate(student.ultima_turma) },
  { key: 'cursos', label: 'Cursos', getValue: (student) => student.cursos },
  { key: 'total_documentos', label: 'Documentos', getValue: (student) => student.total_documentos }
];

const pdfColumnGroups = [
  {
    title: 'Identificacao e contato',
    columns: [
      { key: 'id', width: 32 },
      { key: 'nome_completo', width: 178 },
      { key: 'cpf', width: 84 },
      { key: 'data_nascimento', width: 68 },
      { key: 'telefone', width: 84 },
      { key: 'email', width: 170 },
      { key: 'sexo_descricao', width: 82 },
      { key: 'data_cadastro', width: 70 }
    ]
  },
  {
    title: 'Endereco e origem',
    columns: [
      { key: 'nome_completo', width: 168 },
      { key: 'cep', width: 62 },
      { key: 'rua', width: 146 },
      { key: 'bairro', width: 102 },
      { key: 'numero', width: 48 },
      { key: 'cidade', width: 92 },
      { key: 'estado', width: 54 },
      { key: 'responsavel_inscricao', width: 90 },
      { key: 'empresa', width: 98 }
    ]
  },
  {
    title: 'Perfil profissional',
    columns: [
      { key: 'nome_completo', width: 172 },
      { key: 'sonda_unidade', width: 154 },
      { key: 'operacao', width: 116 },
      { key: 'funcao_descricao', width: 126 },
      { key: 'endereco_completo', width: 206 },
      { key: 'data_atualizacao', width: 78 }
    ]
  },
  {
    title: 'Modalidade em turmas',
    columns: [
      { key: 'nome_completo', width: 190 },
      { key: 'total_turmas', width: 60 },
      { key: 'turmas_presenciais', width: 60 },
      { key: 'turmas_online', width: 60 },
      { key: 'modalidades_aula', width: 190 },
      { key: 'cursos', width: 218 }
    ]
  },
  {
    title: 'Historico e observacoes',
    columns: [
      { key: 'nome_completo', width: 158 },
      { key: 'total_turmas', width: 54 },
      { key: 'turmas_concluidas', width: 62 },
      { key: 'turmas_em_andamento', width: 74 },
      { key: 'primeira_turma', width: 70 },
      { key: 'ultima_turma', width: 70 },
      { key: 'total_documentos', width: 64 },
      { key: 'cursos', width: 130 },
      { key: 'observacao', width: 96 }
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
    ...studentReportColumns.find((item) => item.key === column.key),
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

function buildStudentsPdfPages(students, filtersSummary = '') {
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
    addText(continued ? 'Relatorio de alunos - continuacao' : 'Relatorio de alunos', margin, y, { size: 16, bold: true });
    addText(`Bloco: ${group.title}`, margin + 300, y, { size: 9, bold: true });
    addText(`Total: ${students.length}`, margin + 640, y, { size: 9 });
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

  function addRow(student, index, columns, group) {
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
      addText(cellText(column.getValue(student), column.width), x + 3, rowY + 8, { size: 6.1 });
      x += column.width;
    });
    y = rowY;
  }

  pdfColumnGroups.forEach((group) => {
    const columns = group.columns.map(getColumnDefinition);
    startPage(group, false);
    addHeader(columns);

    if (students.length) {
      students.forEach((student, index) => addRow(student, index, columns, group));
    } else {
      y -= rowHeight;
      strokeRect(margin, y, contentWidth, rowHeight);
      addText('Nenhum aluno encontrado para os filtros selecionados.', margin + 6, y + 8, { size: 7 });
    }
  });

  pushPage();
  return pages;
}

export function downloadStudentsPdf(students, filtersSummary = '') {
  const pages = buildStudentsPdfPages(students, filtersSummary);
  const pdf = buildPdf(pages);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `relatorio-alunos-${fileStamp()}.pdf`);
}

export function downloadStudentsPng(students, filtersSummary = '') {
  const pages = buildStudentsPdfPages(students, filtersSummary);
  downloadPdfCommandPagesAsPng(pages, `relatorio-alunos-${fileStamp()}.png`, { pageWidth: PAGE_WIDTH, pageHeight: PAGE_HEIGHT });
}

export function downloadStudentsExcel(students) {
  const header = studentReportColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const rows = students
    .map(
      (student) =>
        `<tr>${studentReportColumns
          .map((column) => `<td>${escapeHtml(column.getValue(student))}</td>`)
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

  downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `relatorio-alunos-${fileStamp()}.xls`);
}
