const DEFAULT_PAGE_WIDTH = 842;
const DEFAULT_PAGE_HEIGHT = 595;
const PNG_SCALE = 2;

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

function channel(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value || 0) * 255)));
}

function rgb(r, g, b) {
  return `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;
}

function gray(value) {
  const color = channel(value);
  return `rgb(${color}, ${color}, ${color})`;
}

function decodePdfText(value) {
  let output = '';

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character !== '\\') {
      output += character;
      continue;
    }

    const next = value[index + 1];
    if (next === '\\' || next === '(' || next === ')') {
      output += next;
      index += 1;
      continue;
    }

    const octal = value.slice(index + 1, index + 4);
    if (/^[0-7]{3}$/.test(octal)) {
      output += String.fromCharCode(Number.parseInt(octal, 8));
      index += 3;
    }
  }

  return output;
}

function drawCommand(ctx, command, pageOffset, pageHeight) {
  const textMatch = command.match(/^BT \/(F[12]) ([\d.]+) Tf ([\d.-]+) ([\d.-]+) Td \((.*)\) Tj ET$/);
  if (textMatch) {
    const [, fontId, size, x, y, text] = textMatch;
    ctx.fillStyle = '#000000';
    ctx.font = `${fontId === 'F2' ? '700 ' : ''}${Number(size)}px Arial, Helvetica, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(decodePdfText(text), Number(x), pageOffset + pageHeight - Number(y));
    return;
  }

  const fillMatch = command.match(/^q ([\d.]+) ([\d.]+) ([\d.]+) rg ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re f Q$/);
  if (fillMatch) {
    const [, r, g, b, x, y, width, height] = fillMatch;
    ctx.fillStyle = rgb(r, g, b);
    ctx.fillRect(Number(x), pageOffset + pageHeight - Number(y) - Number(height), Number(width), Number(height));
    return;
  }

  const strokeMatch = command.match(/^q ([\d.]+) G ([\d.]+) w ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re S Q$/);
  if (strokeMatch) {
    const [, strokeGray, lineWidth, x, y, width, height] = strokeMatch;
    ctx.strokeStyle = gray(strokeGray);
    ctx.lineWidth = Number(lineWidth);
    ctx.strokeRect(Number(x), pageOffset + pageHeight - Number(y) - Number(height), Number(width), Number(height));
  }
}

export function downloadPdfCommandPagesAsPng(pages, fileName, options = {}) {
  const pageWidth = options.pageWidth || DEFAULT_PAGE_WIDTH;
  const pageHeight = options.pageHeight || DEFAULT_PAGE_HEIGHT;
  const safePages = pages.length ? pages : [''];
  const canvas = document.createElement('canvas');
  canvas.width = pageWidth * PNG_SCALE;
  canvas.height = pageHeight * safePages.length * PNG_SCALE;

  const ctx = canvas.getContext('2d');
  ctx.scale(PNG_SCALE, PNG_SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageWidth, pageHeight * safePages.length);

  safePages.forEach((page, pageIndex) => {
    const pageOffset = pageIndex * pageHeight;
    page
      .split('\n')
      .filter(Boolean)
      .forEach((command) => drawCommand(ctx, command, pageOffset, pageHeight));
  });

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, fileName);
  }, 'image/png');
}
