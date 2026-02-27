import React, { useState, useRef } from 'react';

const api = {
  importCsv: async (file: File) => {
    const token = localStorage.getItem('admin_token') || '';
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/orders/import', { method: 'POST', headers: { Authorization: token }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
  },
};

interface Props { onClose: () => void; onSuccess: () => void; }

export function ImportCsvModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number; errors?: string[] } | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try { const r = await api.importCsv(file); setResult(r); onSuccess(); }
    catch (e: any) { setError((e.message || 'IMPORT FAILED').toUpperCase()); }
    finally { setLoading(false); }
  };

  return (
      <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={s.modal}>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <div style={s.tag}>↑ IMPORT CSV</div>
              <div style={s.subtitle}>Upload orders — taxes auto-calculated</div>
            </div>
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>

          <div style={s.body}>
            {!result ? (
                <>
                  <div
                      ref={dropRef}
                      style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}), ...(file ? s.dropzoneFilled : {}) }}
                      onDragOver={e => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('csv-input')?.click()}
                  >
                    <input id="csv-input" type="file" accept=".csv" style={{ display: 'none' }}
                           onChange={e => setFile(e.target.files?.[0] || null)} />
                    {file ? (
                        <div style={{ textAlign: 'center' }}>
                          <div style={s.fileEmoji}>📄</div>
                          <div style={s.fileName}>{file.name}</div>
                          <div style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB · CSV</div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                          <div style={s.uploadIcon}>↑</div>
                          <div style={s.dropText}>DROP CSV HERE OR <span style={{ color: '#1a3fff', textDecoration: 'underline' }}>BROWSE</span></div>
                          <div style={s.dropHint}>MAX 10MB · CSV FORMAT ONLY</div>
                        </div>
                    )}
                  </div>

                  {error && <div style={s.error}>⚠ {error}</div>}

                  <button style={{ ...s.btn, opacity: (!file || loading) ? 0.4 : 1 }} disabled={!file || loading} onClick={handleSubmit}>
                    {loading ? <><span style={s.spinner} /> PROCESSING...</> : 'IMPORT ORDERS →'}
                  </button>
                </>
            ) : (
                <div style={s.resultBox}>
                  <div style={s.resultBanner}>✓ IMPORT COMPLETE</div>
                  <div style={s.statsRow}>
                    <div style={s.statBox}>
                      <div style={s.statNum}>{result.processed}</div>
                      <div style={s.statLbl}>PROCESSED</div>
                    </div>
                    <div style={s.divider} />
                    <div style={s.statBox}>
                      <div style={{ ...s.statNum, color: result.failed > 0 ? '#ff2d55' : '#0a0a0a' }}>{result.failed}</div>
                      <div style={s.statLbl}>FAILED</div>
                    </div>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                      <div style={s.errorList}>
                        {result.errors.slice(0, 5).map((e, i) => (
                            <div key={i} style={s.errorItem}>⚠ {typeof e === 'string' ? e : `ROW ${(e as any).row}: ${(e as any).reason}`}</div>
                        ))}
                      </div>
                  )}
                  <button style={s.btn} onClick={onClose}>DONE →</button>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.7)', backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  modal: {
    background: '#f5f5f0', border: '2px solid #0a0a0a', boxShadow: '8px 8px 0 #0a0a0a',
    width: '100%', maxWidth: 460, overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '18px 24px', borderBottom: '2px solid #0a0a0a', background: '#0a0a0a',
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  tag: {
    display: 'inline-block', padding: '4px 10px', background: '#c8ff00', color: '#0a0a0a',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '1px',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  subtitle: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '1.5px', color: '#5a5a55' },
  closeBtn: {
    background: 'none', border: '1px solid #2a2a2a', color: '#f5f5f0',
    cursor: 'pointer', padding: '6px 10px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700,
  },
  body: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  dropzone: {
    border: '2px dashed #c0c0bb', padding: '40px 20px', cursor: 'pointer', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eeeee9',
  },
  dropzoneActive: { borderColor: '#1a3fff', background: '#f0f3ff', borderStyle: 'solid' },
  dropzoneFilled: { borderColor: '#c8ff00', borderStyle: 'solid', background: '#f8ffe8' },
  uploadIcon: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: '#9a9a95',
    marginBottom: 8, display: 'block', lineHeight: 1,
  },
  dropText: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#0a0a0a', letterSpacing: '0.5px' },
  dropHint: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#9a9a95', marginTop: 6, letterSpacing: '1px' },
  fileEmoji: { fontSize: 40, marginBottom: 10 },
  fileName: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: '#0a0a0a' },
  fileSize: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#9a9a95', marginTop: 4, letterSpacing: '1px' },
  error: {
    padding: '10px 14px', background: '#ff2d55', color: '#fff',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '1px',
    border: '2px solid #0a0a0a',
  },
  btn: {
    padding: '14px 20px', background: '#c8ff00', color: '#0a0a0a', border: '2px solid #0a0a0a',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '1px',
    cursor: 'pointer', width: '100%', boxShadow: '3px 3px 0 #0a0a0a',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  spinner: {
    display: 'inline-block', width: 13, height: 13,
    border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  resultBox: { display: 'flex', flexDirection: 'column', gap: 16 },
  resultBanner: {
    padding: '14px 18px', background: '#c8ff00', border: '2px solid #0a0a0a',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '2px', textAlign: 'center',
  },
  statsRow: { display: 'flex', justifyContent: 'center', gap: 0, border: '2px solid #0a0a0a' },
  statBox: { flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  divider: { width: 2, background: '#0a0a0a' },
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, lineHeight: 1, color: '#0a0a0a' },
  statLbl: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '2px', color: '#9a9a95' },
  errorList: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' as const },
  errorItem: {
    padding: '6px 10px', background: '#ff2d55', color: '#fff',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700,
  },
};
