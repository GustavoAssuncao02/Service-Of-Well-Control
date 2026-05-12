import { Download, FileText, FileUp, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { formatFileSize } from '../utils/display.js';

function dateLabel(value) {
  return formatDate(String(value || '').slice(0, 10));
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'arquivo';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function TestPage() {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState('');
  const [deletingFile, setDeletingFile] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadFiles() {
    const { data } = await api.get('/test/files');
    setFiles(data);
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');
    api
      .get('/test/files')
      .then((response) => {
        if (active) setFiles(response.data);
      })
      .catch((err) => {
        if (active) setError(getApiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function uploadFile(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    const formData = new FormData();
    formData.append('arquivo', selectedFile);

    setUploading(true);
    try {
      await api.post('/test/upload', formData);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadFiles();
      setSuccess('Arquivo enviado para o projeto com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(file) {
    setError('');
    setDownloadingFile(file.id);

    try {
      const response = await api.get(file.download_url || `/test/files/${encodeURIComponent(file.id)}/download`, { responseType: 'blob' });
      downloadBlob(response.data, file.nome_arquivo);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDownloadingFile('');
    }
  }

  async function removeFile(file) {
    if (!confirm('Excluir este arquivo de teste do projeto?')) return;

    setError('');
    setSuccess('');
    setDeletingFile(file.id);
    try {
      await api.delete(`/test/files/${encodeURIComponent(file.id)}`);
      await loadFiles();
      setSuccess('Arquivo removido do projeto.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeletingFile('');
    }
  }

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Admin</span>
        <h1>Teste</h1>
        <p>Envie um arquivo para salvar localmente no projeto e baixe depois pela propria API.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <section className="panel">
        <div className="panel-heading">
          <h2>Upload local</h2>
          <span>Salva em backend/storage/test-uploads</span>
        </div>

        <form className="user-upload-form" onSubmit={uploadFile}>
          <Field label="Arquivo">
            <input ref={fileInputRef} type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
            {selectedFile ? (
              <small>
                {selectedFile.name} - {formatFileSize(selectedFile.size)}
              </small>
            ) : null}
          </Field>
          <button className="primary-button" type="submit" disabled={uploading}>
            <FileUp size={18} />
            {uploading ? 'Enviando...' : 'Enviar'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setLoading(true);
              loadFiles()
                .catch((err) => setError(getApiError(err)))
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            <RefreshCcw size={17} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Arquivos no projeto</h2>
          <span>{files.length} arquivo(s)</span>
        </div>

        {files.length ? (
          <div className="user-file-list">
            {files.map((file) => (
              <div key={file.id} className="document-row user-file-row">
                <FileText size={20} />
                <div>
                  <strong>{file.nome_arquivo}</strong>
                  <small>{formatFileSize(file.tamanho_bytes)}</small>
                  <span>
                    Salvo como {file.nome_salvo} - {dateLabel(file.criado_em)}
                  </span>
                </div>
                <div className="document-row-actions">
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => downloadFile(file)}
                    disabled={downloadingFile === file.id}
                    aria-label="Baixar arquivo"
                  >
                    <Download size={17} />
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    onClick={() => removeFile(file)}
                    disabled={deletingFile === file.id}
                    aria-label="Excluir arquivo"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum arquivo de teste" description="Envie um arquivo para validar o upload local." />
        )}
      </section>
    </div>
  );
}
