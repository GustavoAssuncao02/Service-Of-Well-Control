import { Edit3, ExternalLink, FileText, FileUp, Folder, FolderOpen, FolderPlus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, getApiError } from '../api/client.js';
import { EmptyState, Field } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { formatFileSize } from '../utils/display.js';

const emptyArea = {
  folders: [],
  files: [],
  notes: []
};

const emptyNoteForm = {
  id: '',
  titulo: '',
  conteudo: ''
};

function dateLabel(value) {
  return formatDate(String(value || '').slice(0, 10));
}

function folderCountLabel(total) {
  const count = Number(total || 0);
  return `${count} ${count === 1 ? 'arquivo' : 'arquivos'}`;
}

function notePreview(content) {
  const text = String(content || '').trim();
  if (!text) return 'Sem conteudo.';
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

export default function UserArea() {
  const fileInputRef = useRef(null);
  const [area, setArea] = useState(emptyArea);
  const [selectedFolderId, setSelectedFolderId] = useState('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [loading, setLoading] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);
  const [savingFiles, setSavingFiles] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadArea() {
    const { data } = await api.get('/user-area');
    setArea(data);
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError('');

    api
      .get('/user-area')
      .then((response) => {
        if (active) setArea(response.data);
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

  const filteredFiles = useMemo(() => {
    if (selectedFolderId === 'all') return area.files;
    if (selectedFolderId === 'root') return area.files.filter((file) => !file.pasta_id);
    return area.files.filter((file) => String(file.pasta_id) === String(selectedFolderId));
  }, [area.files, selectedFolderId]);

  async function createFolder(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!newFolderName.trim()) {
      setError('Informe o nome da pasta.');
      return;
    }

    setSavingFolder(true);
    try {
      await api.post('/user-area/folders', { nome: newFolderName });
      setNewFolderName('');
      await loadArea();
      setSuccess('Pasta criada com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingFolder(false);
    }
  }

  async function uploadFiles(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedFiles.length) {
      setError('Selecione um ou mais arquivos.');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('arquivos', file);
    });
    if (uploadFolderId) {
      formData.append('pasta_id', uploadFolderId);
    }

    setSavingFiles(true);
    try {
      await api.post('/user-area/files', formData);
      setSelectedFiles([]);
      setUploadFolderId('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadArea();
      setSuccess('Arquivo(s) enviado(s) com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingFiles(false);
    }
  }

  async function removeFile(fileId) {
    if (!confirm('Remover este arquivo da sua area?')) return;

    setError('');
    setSuccess('');
    setDeletingFileId(fileId);
    try {
      await api.delete(`/user-area/files/${fileId}`);
      await loadArea();
      setSuccess('Arquivo removido com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeletingFileId(null);
    }
  }

  function editNote(note) {
    setError('');
    setSuccess('');
    setNoteForm({
      id: note.id,
      titulo: note.titulo || '',
      conteudo: note.conteudo || ''
    });
  }

  async function saveNote(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!noteForm.titulo.trim()) {
      setError('Informe o titulo da nota.');
      return;
    }

    setSavingNote(true);
    try {
      if (noteForm.id) {
        await api.put(`/user-area/notes/${noteForm.id}`, {
          titulo: noteForm.titulo,
          conteudo: noteForm.conteudo
        });
        setSuccess('Nota atualizada com sucesso.');
      } else {
        await api.post('/user-area/notes', {
          titulo: noteForm.titulo,
          conteudo: noteForm.conteudo
        });
        setSuccess('Nota criada com sucesso.');
      }

      setNoteForm(emptyNoteForm);
      await loadArea();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSavingNote(false);
    }
  }

  async function removeNote(noteId) {
    if (!confirm('Excluir esta nota?')) return;

    setError('');
    setSuccess('');
    setDeletingNoteId(noteId);
    try {
      await api.delete(`/user-area/notes/${noteId}`);
      if (String(noteForm.id) === String(noteId)) {
        setNoteForm(emptyNoteForm);
      }
      await loadArea();
      setSuccess('Nota excluida com sucesso.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setDeletingNoteId(null);
    }
  }

  return (
    <div className="page-stack user-area-page">
      <div className="section-heading">
        <span>Conta</span>
        <h1>Area do usuario</h1>
        <p>Arquivos, pastas e notas particulares do usuario logado.</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <section className="user-area-grid">
        <div className="stack">
          <article className="panel">
            <div className="panel-heading">
              <h2>Pastas</h2>
              <span>{area.folders.length} pasta(s)</span>
            </div>

            <form className="user-area-toolbar" onSubmit={createFolder}>
              <Field label="Nova pasta">
                <input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="Ex.: Certificados" />
              </Field>
              <button className="primary-button" type="submit" disabled={savingFolder}>
                <FolderPlus size={18} />
                {savingFolder ? 'Criando...' : 'Criar pasta'}
              </button>
            </form>

            <div className="folder-strip">
              <button className={`folder-filter-button ${selectedFolderId === 'all' ? 'active' : ''}`} type="button" onClick={() => setSelectedFolderId('all')}>
                <FolderOpen size={18} />
                <span>Todos</span>
                <small>{folderCountLabel(area.files.length)}</small>
              </button>
              <button className={`folder-filter-button ${selectedFolderId === 'root' ? 'active' : ''}`} type="button" onClick={() => setSelectedFolderId('root')}>
                <Folder size={18} />
                <span>Sem pasta</span>
                <small>{folderCountLabel(area.files.filter((file) => !file.pasta_id).length)}</small>
              </button>
              {area.folders.map((folder) => (
                <button
                  key={folder.id}
                  className={`folder-filter-button ${String(selectedFolderId) === String(folder.id) ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSelectedFolderId(String(folder.id))}
                >
                  <Folder size={18} />
                  <span>{folder.nome}</span>
                  <small>{folderCountLabel(folder.total_arquivos)}</small>
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <h2>Enviar arquivos</h2>
              {loading ? <span>Atualizando...</span> : null}
            </div>

            <form className="user-upload-form" onSubmit={uploadFiles}>
              <Field label="Arquivos">
                <input ref={fileInputRef} type="file" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))} />
                {selectedFiles.length ? (
                  <small>
                    {selectedFiles.length} arquivo(s): {selectedFiles.map((file) => file.name).join(', ')}
                  </small>
                ) : null}
              </Field>
              <Field label="Pasta">
                <select value={uploadFolderId} onChange={(event) => setUploadFolderId(event.target.value)}>
                  <option value="">Sem pasta</option>
                  {area.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <button className="primary-button" type="submit" disabled={savingFiles}>
                <FileUp size={18} />
                {savingFiles ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <h2>Arquivos salvos</h2>
              <span>{filteredFiles.length} arquivo(s)</span>
            </div>

            {filteredFiles.length ? (
              <div className="user-file-list">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="document-row user-file-row">
                    <FileText size={20} />
                    <div>
                      <strong>{file.nome_arquivo}</strong>
                      <small>
                        {file.tipo_arquivo || 'Arquivo'} - {formatFileSize(file.tamanho_bytes)}
                      </small>
                      <span>
                        {file.pasta_nome || 'Sem pasta'} - {dateLabel(file.criado_em)}
                      </span>
                    </div>
                    <div className="document-row-actions">
                      {file.drive_url ? (
                        <a className="icon-button" href={file.drive_url} target="_blank" rel="noreferrer" aria-label="Abrir arquivo no Google Drive">
                          <ExternalLink size={17} />
                        </a>
                      ) : null}
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => removeFile(file.id)}
                        disabled={deletingFileId === file.id}
                        aria-label="Remover arquivo"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sem arquivos" description="Envie arquivos para manter sua area organizada." />
            )}
          </article>
        </div>

        <aside className="stack">
          <article className="panel">
            <div className="panel-heading">
              <h2>Bloco de notas</h2>
              <span>{noteForm.id ? 'Editando' : 'Nova nota'}</span>
            </div>

            <form className="stack" onSubmit={saveNote}>
              <Field label="Titulo">
                <input value={noteForm.titulo} onChange={(event) => setNoteForm((current) => ({ ...current, titulo: event.target.value }))} />
              </Field>
              <Field label="Conteudo">
                <textarea
                  className="user-note-textarea"
                  value={noteForm.conteudo}
                  onChange={(event) => setNoteForm((current) => ({ ...current, conteudo: event.target.value }))}
                />
              </Field>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={savingNote}>
                  <Save size={18} />
                  {savingNote ? 'Salvando...' : noteForm.id ? 'Salvar nota' : 'Criar nota'}
                </button>
                {noteForm.id ? (
                  <button className="ghost-button" type="button" onClick={() => setNoteForm(emptyNoteForm)}>
                    <X size={16} />
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <h2>Notas salvas</h2>
              <span>{area.notes.length} nota(s)</span>
            </div>

            {area.notes.length ? (
              <div className="note-list">
                {area.notes.map((note) => (
                  <div key={note.id} className={`note-card ${String(noteForm.id) === String(note.id) ? 'active' : ''}`}>
                    <div>
                      <strong>{note.titulo}</strong>
                      <small>Atualizada em {dateLabel(note.atualizado_em)}</small>
                      <p>{notePreview(note.conteudo)}</p>
                    </div>
                    <div className="note-card-actions">
                      <button className="icon-button" type="button" onClick={() => editNote(note)} aria-label="Editar nota">
                        <Edit3 size={17} />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        onClick={() => removeNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        aria-label="Excluir nota"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sem notas" description="Crie sua primeira nota para guardar lembretes importantes." />
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
