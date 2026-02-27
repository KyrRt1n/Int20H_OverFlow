import React, { useState } from 'react';

interface LoginProps {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!login || !password) { setError('ENTER CREDENTIALS'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('admin_token', data.token);
      onLogin(data.token);
    } catch (e: any) {
      setError((e.message || 'LOGIN FAILED').toUpperCase());
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.bgText}>BETTERME</div>

      <div style={s.leftCol}>
        <div style={s.droneBox}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.5">
            <path d="M3 3l3 3m12-3l-3 3M3 21l3-3m12 3l-3-3"/>
            <circle cx="12" cy="12" r="3"/>
            <path d="M6 6a3 3 0 004.24 4.24M17.76 6.24A3 3 0 0114 9.76M6.24 17.76A3 3 0 019.76 14M14 14.24A3 3 0 0117.76 18"/>
          </svg>
        </div>
        <div style={s.tagline}>
          <span style={s.tagLine}>DRONE</span>
          <span style={s.tagLine}>DELIVERY</span>
          <span style={s.tagLine}>TAX</span>
        </div>
        <div style={s.jurisdictionPill}>↳ NEW YORK STATE JURISDICTION</div>
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <div style={s.cardLabel}>SYS / ACCESS_01</div>
          <div style={s.cardTitle}>SIGN IN</div>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>LOGIN_</label>
          <input style={s.input} type="text" placeholder="admin" value={login}
            onChange={e => setLogin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>PASSWORD_</label>
          <input style={s.input} type="password" placeholder="••••••••" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        {error && <div style={s.error}>⚠ {error}</div>}

        <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? <><span style={s.spinner} /> AUTHENTICATING...</> : <>ENTER SYSTEM <span>→</span></>}
        </button>

        <div style={s.footer}>
          <span style={s.dot} /> SECURE ADMIN PORTAL · BETTERME CORP
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    height: '100vh', width: '100vw',
    background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Space Grotesk', sans-serif", position: 'relative', overflow: 'hidden', gap: 64,
  },
  bgText: {
    position: 'absolute', bottom: '-50px', left: '-20px',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(120px,20vw,280px)',
    color: 'transparent', WebkitTextStroke: '2px #e0e0db', letterSpacing: '-4px',
    userSelect: 'none', pointerEvents: 'none', lineHeight: 1, zIndex: 0,
  },
  leftCol: { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 28 },
  droneBox: {
    width: 110, height: 110, background: '#c8ff00', border: '2px solid #0a0a0a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '5px 5px 0 #0a0a0a',
  },
  tagline: { display: 'flex', flexDirection: 'column', gap: 0 },
  tagLine: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, lineHeight: 0.92, color: '#0a0a0a', letterSpacing: '2px', display: 'block' },
  jurisdictionPill: {
    background: '#1a3fff', color: '#f5f5f0', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', padding: '7px 14px',
    border: '2px solid #0a0a0a', boxShadow: '3px 3px 0 #0a0a0a', display: 'inline-block',
  },
  card: {
    position: 'relative', zIndex: 1, background: '#f5f5f0', border: '2px solid #0a0a0a',
    boxShadow: '8px 8px 0 #0a0a0a', padding: '40px 36px', width: 400,
    display: 'flex', flexDirection: 'column', gap: 22,
  },
  cardHead: { borderBottom: '2px solid #0a0a0a', paddingBottom: 20 },
  cardLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '3px', color: '#5a5a55', marginBottom: 4 },
  cardTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, letterSpacing: '3px', color: '#0a0a0a', lineHeight: 1 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '2px', color: '#5a5a55' },
  input: {
    padding: '13px 16px', border: '2px solid #0a0a0a', background: '#fff',
    fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, color: '#0a0a0a', width: '100%',
  },
  error: {
    padding: '12px 16px', background: '#ff2d55', color: '#fff',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '1px',
    border: '2px solid #0a0a0a', boxShadow: '3px 3px 0 #0a0a0a',
  },
  btn: {
    padding: '16px 20px', background: '#c8ff00', color: '#0a0a0a', border: '2px solid #0a0a0a',
    fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '1px',
    cursor: 'pointer', width: '100%', boxShadow: '4px 4px 0 #0a0a0a',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  spinner: {
    display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 8,
  },
  footer: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#9a9a95', letterSpacing: '1px',
    paddingTop: 4, borderTop: '1px solid #e0e0db',
  },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#c8ff00', border: '1px solid #0a0a0a', flexShrink: 0 },
};
