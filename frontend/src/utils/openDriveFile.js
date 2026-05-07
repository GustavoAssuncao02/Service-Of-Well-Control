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
    const { data } = await api.post(`/drive/files/${fileId}/ticket`);
    const url = new URL(data.url, api.defaults.baseURL || window.location.origin);

    if (popup) {
      popup.location.href = url.toString();
    } else {
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    if (popup) {
      popup.close();
    }
    throw error;
  }
}
