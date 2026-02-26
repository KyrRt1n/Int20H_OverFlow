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
    if (!login || !password) {
      setError('Please enter login and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('admin_token', data.token);
      onLogin(data.token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoIcon}>B</div>
          <div>
            <div style={s.logoName}>BetterMe</div>
            <div style={s.logoTag}>Drone Delivery Tax</div>
          </div>
        </div>

        <div style={s.title}>Admin Login</div>
        <div style={s.subtitle}>Enter your credentials to access the dashboard</div>

        <div style={s.field}>
          <label style={s.label}>Login</label>
          <input
            style={s.input}
            type="text"
            placeholder="admin"
            value={login}
            onChange={e => setLogin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button
          style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 36px',
    width: 380,
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 800,
    fontSize: 20,
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
    flexShrink: 0,
  },
  logoName: { fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' },
  logoTag: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  title: { fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: -8 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  input: {
    padding: '11px 14px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  error: {
    padding: '10px 14px',
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: 10,
    fontSize: 13,
    color: '#f43f5e',
    fontWeight: 500,
  },
  btn: {
    padding: '13px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
    transition: 'opacity 0.15s',
    marginTop: 4,
  },
};