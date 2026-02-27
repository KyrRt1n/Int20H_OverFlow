import React, { useState, useRef } from 'react';

const api = {
  importCsv: async (file: File) => {
    const token = localStorage.getItem('admin_token') || '';
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/orders/import', {
      method: 'POST',
      headers: { Authorization: token },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
  },
};

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportCsvModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number; errors?: string[] } | null>(null);
  const [error, setError] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const r = await api.importCsv(file);
      setResult(r);
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={s.modalIcon}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <div style={s.modalTitle}>Import CSV</div>
              <div style={s.modalSubtitle}>Upload orders — taxes will be calculated automatically</div>
            </div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={s.modalBody}>
          {!result ? (
            <>
              <div
                ref={dropRef}
                style={{ ...s.dropzone, ...(file ? s.dropzoneActive : {}) }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById('csv-input')?.click()}
              >
                <input id="csv-input" type="file" accept=".csv" style={{ display: 'none' }}
                       onChange={e => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={s.fileIcon}>📄</div>
                    <div style={s.fileName}>{file.name}</div>
                    <div style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={s.dropIcon}>
                      <svg width="28" height="28" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <div style={s.dropText}>Drop CSV here or <span style={{ color: '#6366f1' }}>browse</span></div>
                    <div style={s.dropHint}>Max 10MB · CSV only</div>
                  </div>
                )}
              </div>

              <div style={s.fieldGroup}>
              </div>

              {error && <div style={s.errorBox}>{error}</div>}

              <button
                style={{ ...s.primaryBtn, opacity: (!file || loading) ? 0.5 : 1 }}
                disabled={!file || loading}
                onClick={handleSubmit}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={s.spinner} /> Processing...
                  </span>
                ) : 'Import Orders'}
              </button>
            </>
          ) : (
            <div style={s.resultBox}>
              <div style={s.resultSuccess}>
                <svg width="32" height="32" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                <div style={s.resultTitle}>Import Complete</div>
              </div>
              <div style={s.resultStats}>
                <div style={s.resultStat}>
                  <span style={s.resultStatNum}>{result.processed}</span>
                  <span style={s.resultStatLabel}>processed</span>
                </div>
                <div style={s.resultStatDivider} />
                <div style={s.resultStat}>
                  <span style={{ ...s.resultStatNum, color: result.failed > 0 ? '#f43f5e' : '#10b981' }}>{result.failed}</span>
                  <span style={s.resultStatLabel}>failed</span>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div style={s.errorList}>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <div key={i} style={s.errorItem}>⚠ {typeof e === 'string' ? e : `Row ${(e as any).row}: ${(e as any).reason}`}</div>
                  ))}
                </div>
              )}
              <button style={s.primaryBtn} onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
  },
  modalIcon: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  modalSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
  },
  modalBody: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  dropzone: {
    border: '2px dashed #e2e8f0',
    borderRadius: 14,
    padding: '32px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
  },
  dropzoneActive: { borderColor: '#6366f1', background: '#eef2ff' },
  dropIcon: { marginBottom: 10, display: 'flex', justifyContent: 'center' },
  dropText: { fontSize: 14, color: '#475569', fontWeight: 500 },
  dropHint: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  fileIcon: { fontSize: 32, marginBottom: 8 },
  fileName: { fontSize: 14, fontWeight: 600, color: '#1e293b' },
  fileSize: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  errorBox: {
    padding: '10px 14px',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 10,
    fontSize: 13,
    color: '#f43f5e',
    fontWeight: 500,
  },
  primaryBtn: {
    padding: '12px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
    transition: 'opacity 0.15s',
  },
  spinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  resultBox: { display: 'flex', flexDirection: 'column', gap: 16 },
  resultSuccess: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  resultTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  resultStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    padding: '16px 0',
    background: '#f8fafc',
    borderRadius: 14,
  },
  resultStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  resultStatNum: { fontSize: 32, fontWeight: 800, color: '#10b981', lineHeight: 1 },
  resultStatLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  resultStatDivider: { width: 1, background: '#e2e8f0' },
  errorList: { display: 'flex', flexDirection: 'column', gap: 4 },
  errorItem: { fontSize: 12, color: '#f43f5e', padding: '6px 10px', background: '#fff1f2', borderRadius: 8 },
};