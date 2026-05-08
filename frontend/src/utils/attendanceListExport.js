import { formatDate } from './date.js';

function plainText(value) {
  return String(value ?? '-')
    .replace(/[\r\n\t]+/g, ' ')
    .trim() || '-';
}

function escapeHtml(value) {
  return plainText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function uniqueValues(values) {
  return [...new Set(values.map(plainText).filter((value) => value && value !== '-'))];
}

function studentCompany(student) {
  return student.empresa_nome || student.empresa || 'Particular';
}

function studentRole(student) {
  if (student.funcao === 'Outro') return student.funcao_outro || student.funcao;
  return student.funcao || '-';
}

function printDocument(popup, html) {
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export function openAttendanceListPdf(turma) {
  const popup = window.open('', '_blank');

  if (!popup) {
    alert('Nao foi possivel abrir a lista de presenca. Libere pop-ups para este site e tente novamente.');
    return;
  }

  popup.opener = null;

  const students = turma.alunos || [];
  const logoUrl = `${window.location.origin}/logo.jpg`;
  const companies = uniqueValues(students.map(studentCompany));
  const modalities = uniqueValues(students.map((student) => student.modalidade_aula_nome || student.classificacao_presenca_nome));
  const companyLabel = companies.length ? companies.join(', ') : '-';
  const modalityLabel = modalities.length ? modalities.join(', ') : '-';

  const rows = students.length
    ? students
        .map(
          (student, index) => `
            <tr>
              <td class="number">${index + 1}</td>
              <td>${escapeHtml(student.nome_completo)}</td>
              <td>${escapeHtml(studentCompany(student))}</td>
              <td>${escapeHtml(studentRole(student))}</td>
              <td>${escapeHtml(student.operacao)}</td>
              <td class="signature"></td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="6" class="empty-row">Nenhum aluno vinculado a esta turma.</td></tr>';

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Lista de presenca - ${escapeHtml(turma.curso_nome || `Turma ${turma.id}`)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
          }

          .document {
            width: 100%;
          }

          .header {
            display: grid;
            grid-template-columns: 145px 1fr auto;
            gap: 18px;
            align-items: center;
            padding-bottom: 12px;
            border-bottom: 2px solid #1d4f91;
          }

          .logo {
            width: 130px;
            max-height: 62px;
            object-fit: contain;
          }

          h1 {
            margin: 0 0 5px;
            color: #10233f;
            font-size: 22px;
            line-height: 1.1;
          }

          .subtitle,
          .generated {
            color: #475569;
            font-size: 11px;
            font-weight: 700;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            margin: 14px 0;
          }

          .summary-item {
            min-height: 54px;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #f8fafc;
          }

          .summary-item span {
            display: block;
            margin-bottom: 4px;
            color: #64748b;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .summary-item strong {
            display: block;
            overflow-wrap: anywhere;
            color: #111827;
            font-size: 12px;
            line-height: 1.25;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #cbd5e1;
            padding: 7px 8px;
            text-align: left;
            vertical-align: middle;
            overflow-wrap: anywhere;
          }

          th {
            background: #eaf1fb;
            color: #1e3a5f;
            font-size: 10px;
            letter-spacing: 0.03em;
            text-transform: uppercase;
          }

          td {
            height: 35px;
            font-size: 11px;
          }

          tbody tr:nth-child(even) td {
            background: #fbfdff;
          }

          .number {
            width: 34px;
            text-align: center;
            font-weight: 700;
          }

          .signature {
            width: 180px;
          }

          .empty-row {
            height: 46px;
            text-align: center;
            color: #64748b;
            font-weight: 700;
          }

          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px;
            margin-top: 26px;
          }

          .footer-line {
            padding-top: 28px;
            border-top: 1px solid #334155;
            text-align: center;
            color: #334155;
            font-size: 10px;
            font-weight: 700;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <main class="document">
          <header class="header">
            <img class="logo" src="${logoUrl}" alt="SWC" />
            <div>
              <h1>Lista de presenca</h1>
              <div class="subtitle">SWC - Service Of WellControl</div>
            </div>
            <div class="generated">Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
          </header>

          <section class="summary" aria-label="Informacoes da turma">
            <div class="summary-item"><span>Empresa</span><strong>${escapeHtml(companyLabel)}</strong></div>
            <div class="summary-item"><span>Curso</span><strong>${escapeHtml(turma.curso_nome)}</strong></div>
            <div class="summary-item"><span>Periodo</span><strong>${escapeHtml(`${formatDate(turma.data_inicio)} a ${formatDate(turma.data_fim)}`)}</strong></div>
            <div class="summary-item"><span>Instrutor</span><strong>${escapeHtml(turma.instrutor_nome)}</strong></div>
            <div class="summary-item"><span>Modalidade</span><strong>${escapeHtml(modalityLabel)}</strong></div>
            <div class="summary-item"><span>Classificacao</span><strong>${escapeHtml(turma.classificacao_nome)}</strong></div>
            <div class="summary-item"><span>Local</span><strong>${escapeHtml(turma.local)}</strong></div>
            <div class="summary-item"><span>Sala online</span><strong>${escapeHtml(turma.sala_online)}</strong></div>
          </section>

          <table>
            <thead>
              <tr>
                <th class="number">#</th>
                <th>Nome do aluno</th>
                <th>Empresa</th>
                <th>Funcao</th>
                <th>Operacao</th>
                <th class="signature">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <section class="footer">
            <div class="footer-line">Instrutor</div>
            <div class="footer-line">Responsavel pela turma</div>
          </section>
        </main>
        <script>
          let printed = false;
          function printWhenReady() {
            if (printed) return;
            printed = true;
            setTimeout(() => {
              window.focus();
              window.print();
            }, 250);
          }
          window.addEventListener('load', printWhenReady);
          setTimeout(printWhenReady, 1500);
        </script>
      </body>
    </html>
  `;

  printDocument(popup, html);
}
