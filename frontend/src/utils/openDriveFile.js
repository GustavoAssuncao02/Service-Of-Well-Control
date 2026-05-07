import { api } from '../api/client.js';

export async function openDriveFile(fileId) {
  if (!fileId) {
    throw new Error('Arquivo sem identificador do Google Drive.');
  }

  const popup = window.open('', '_blank');
  if (popup) {
    popup.opener = null;
    popup.document.title = 'Abrindo arquivo';
    popup.document.body.textContent = 'Abrindo arquivo...';
  }

  try {
    const { data, headers } = await api.get(`/drive/files/${fileId}`, {
      responseType: 'blob'
    });
    const mimeType = headers['content-type'] || data.type || 'application/octet-stream';
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);

    if (popup) {
      popup.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (popup) {
      popup.close();
    }
    throw error;
  }
}
