import React, { useState, useEffect, useCallback } from 'react';
import { ImportCsvModal } from './components/ImportCsvModal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Login from './Login';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface TaxBreakdown { state_rate: number; county_rate: number; city_rate: number; special_rates: number; }
interface Order { id: number; latitude: number; longitude: number; timestamp: string; subtotal: number; composite_tax_rate: number; tax_amount: number; total_amount: number; breakdown: TaxBreakdown; jurisdictions: string[]; status?: string; }
interface Pagination { total: number; page: number; limit: number; totalPages: number; }
interface Filters { status: string; subtotal_min: string; subtotal_max: string; from: string; to: string; }

const api = {
  getOrders: async (page: number, limit: number, filters: Filters, sort?: { by: string; dir: string }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (sort) { params.set('sort_by', sort.by); params.set('sort_dir', sort.dir); }
    if (filters.status) params.set('status', filters.status);
    if (filters.subtotal_min) params.set('subtotal_min', filters.subtotal_min);
    if (filters.subtotal_max) params.set('subtotal_max', filters.subtotal_max);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const token = localStorage.getItem('admin_token') || '';
    const res = await fetch(`/orders?${params}`, { headers: { Authorization: token } });
    if (res.status === 401) { localStorage.removeItem('admin_token'); window.location.reload(); }
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json() as Promise<{ data: Order[]; pagination: Pagination; summary: { total_orders: number; total_tax: number; total_revenue: number } }>;
  },
  createOrder: async (lat: number, lon: number, subtotal: number) => {
    const token = localStorage.getItem('admin_token') || '';
    const res = await fetch('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify({ latitude: lat, longitude: lon, subtotal }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create order');
    return data;
  },
  importCsv: async (file: File) => {
    const token = localStorage.getItem('admin_token') || '';
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/orders/import', { method: 'POST', headers: { Authorization: token }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data;
  },
};

function ManualOrderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const latN = parseFloat(lat), lonN = parseFloat(lon), subN = parseFloat(subtotal);
    if (isNaN(latN) || isNaN(lonN) || isNaN(subN)) { setError('ALL FIELDS MUST BE VALID NUMBERS'); return; }
    setLoading(true); setError('');
    try { const r = await api.createOrder(latN, lonN, subN); setResult(r); onSuccess(); }
    catch (e: any) { setError((e.message || 'ERROR').toUpperCase()); }
    finally { setLoading(false); }
  };

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.modal}>
        <div style={m.header}>
          <div style={m.headerLeft}>
            <div style={{ ...m.tag, background: '#c8ff00', color: '#0a0a0a' }}>+ NEW ORDER</div>
            <div style={m.subtitle}>Coordinates → Auto Tax Calculation</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {!result ? (
            <>
              <div style={m.coordRow}>
                <div style={{ flex: 1 }}>
                  <label style={m.label}>LATITUDE_</label>
                  <input type="number" placeholder="42.3601" value={lat} onChange={e => setLat(e.target.value)} style={m.input} step="any" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={m.label}>LONGITUDE_</label>
                  <input type="number" placeholder="-71.0589" value={lon} onChange={e => setLon(e.target.value)} style={m.input} step="any" />
                </div>
              </div>
              <div>
                <label style={m.label}>SUBTOTAL ($)_</label>
                <input type="number" placeholder="99.99" value={subtotal} onChange={e => setSubtotal(e.target.value)} style={m.input} step="0.01" min="0" />
              </div>
              <div style={m.hint}>↳ COORDINATES MUST BE WITHIN NEW YORK STATE BOUNDS</div>
              {error && <div style={m.error}>⚠ {error}</div>}
              <button style={{ ...m.btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSubmit}>
                {loading ? <><span style={m.spinner} /> CALCULATING...</> : 'CREATE ORDER →'}
              </button>
            </>
          ) : (
            <div style={m.resultBox}>
              <div style={m.resultBanner}>✓ ORDER #{result.orderId} CREATED</div>
              <div style={m.taxGrid}>
                <div style={m.taxItem}><span style={m.taxKey}>TAX RATE</span><span style={m.taxVal}>{(result.tax.composite_tax_rate * 100).toFixed(3)}%</span></div>
                <div style={m.taxItem}><span style={m.taxKey}>TAX AMT</span><span style={{ ...m.taxVal, color: '#ff2d55' }}>${result.tax.tax_amount.toFixed(2)}</span></div>
                <div style={{ ...m.taxItem, gridColumn: '1/-1', borderTop: '2px solid #0a0a0a', paddingTop: 12 }}>
                  <span style={m.taxKey}>TOTAL</span><span style={{ ...m.taxVal, fontSize: 28, color: '#1a3fff' }}>${result.tax.total_amount.toFixed(2)}</span>
                </div>
              </div>
              <div style={m.pillRow}>{result.tax.jurisdictions.map((j: string) => <span key={j} style={m.pill}>{j}</span>)}</div>
              <button style={m.btn} onClick={onClose}>DONE →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const handleLogin = (t: string) => setToken(t);
  const handleLogout = () => { localStorage.removeItem('admin_token'); setToken(null); };
  if (!token) return <Login onLogin={handleLogin} />;
  return <Dashboard onLogout={handleLogout} />;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [summary, setSummary] = useState({ total_orders: 0, total_tax: 0, total_revenue: 0 });
  const [filters, setFilters] = useState<Filters>({ status: '', subtotal_min: '', subtotal_max: '', from: '', to: '' });
  const [sort, setSort] = useState<{ by: string; dir: 'asc' | 'desc' }>({ by: 'date', dir: 'desc' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'import' | 'manual' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const loadOrders = useCallback(async (page = pagination.page, currentSort = sort) => {
    setLoading(true);
    try {
      const res = await api.getOrders(page, pagination.limit, filters, currentSort);
      setOrders(res.data); setPagination(res.pagination);
      if (res.summary) setSummary(res.summary);
    } catch { showToast('FAILED TO LOAD ORDERS', 'error'); }
    finally { setLoading(false); }
  }, [filters, pagination.limit, sort]);

  useEffect(() => { loadOrders(1); }, [filters, sort]);

  const mapCenter: [number, number] = [42.9538, -75.5268];
  const NY_BOUNDS = L.latLngBounds(L.latLng(24.396308, -125.0), L.latLng(49.384358, -66.93457));

  const setPage = (p: number) => { setPagination(prev => ({ ...prev, page: p })); loadOrders(p); };
  const filtersActive = filters.status || filters.subtotal_min || filters.subtotal_max || filters.from || filters.to;

  return (
    <div style={d.app}>
      {/* Toast */}
      {toast && (
        <div style={{ ...d.toast, background: toast.type === 'success' ? '#c8ff00' : '#ff2d55', color: toast.type === 'success' ? '#0a0a0a' : '#fff' }}>
          {toast.type === 'success' ? '✓' : '⚠'} {toast.msg.toUpperCase()}
        </div>
      )}

      {modal === 'import' && <ImportCsvModal onClose={() => setModal(null)} onSuccess={() => { showToast('CSV IMPORTED'); loadOrders(1); }} />}
      {modal === 'manual' && <ManualOrderModal onClose={() => setModal(null)} onSuccess={() => { showToast('ORDER CREATED'); loadOrders(1); }} />}

      {/* SIDEBAR */}
      <aside style={d.sidebar}>
        {/* Brand */}
        <div style={d.brand}>
          <div style={d.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2">
              <path d="M3 3l3 3m12-3l-3 3M3 21l3-3m12 3l-3-3"/>
              <circle cx="12" cy="12" r="3"/>
              <path d="M9 9a3 3 0 000 6m6 0a3 3 0 000-6"/>
            </svg>
          </div>
          <div>
            <div style={d.brandName}>BETTERME</div>
            <div style={d.brandSub}>DRONE TAX ADMIN</div>
          </div>
        </div>

        {/* Stats */}
        <div style={d.statsSection}>
          <div style={d.sectionLabel}>/ METRICS</div>

          <div style={d.statCard}>
            <div style={d.statNum}>{summary.total_orders.toLocaleString()}</div>
            <div style={d.statLabel}>TOTAL DELIVERIES</div>
            <div style={d.statBar}><div style={{ ...d.statBarFill, background: '#c8ff00', width: '100%' }} /></div>
          </div>

          <div style={{ ...d.statCard, borderColor: '#ff2d55' }}>
            <div style={{ ...d.statNum, color: '#ff2d55' }}>
              ${summary.total_tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={d.statLabel}>TAXES COLLECTED</div>
            <div style={d.statBar}><div style={{ ...d.statBarFill, background: '#ff2d55', width: '68%' }} /></div>
          </div>

          <div style={{ ...d.statCard, borderColor: '#1a3fff' }}>
            <div style={{ ...d.statNum, color: '#1a3fff' }}>
              ${summary.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={d.statLabel}>TOTAL REVENUE</div>
            <div style={d.statBar}><div style={{ ...d.statBarFill, background: '#1a3fff', width: '85%' }} /></div>
          </div>
        </div>

        {/* Actions */}
        <div style={d.actionsSection}>
          <div style={d.sectionLabel}>/ ACTIONS</div>
          <button style={d.actionBtn} onClick={() => setModal('import')}>
            <span style={d.btnIcon}>↑</span> IMPORT CSV
          </button>
          <button style={{ ...d.actionBtn, ...d.actionBtnAlt }} onClick={() => setModal('manual')}>
            <span style={d.btnIcon}>+</span> MANUAL ORDER
          </button>
        </div>

        {/* Footer */}
        <div style={d.sideFooter}>
          <div style={d.jurisdictionTag}>NY STATE ZONE</div>
          <button style={d.logoutBtn} onClick={onLogout}>LOGOUT ↩</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={d.main}>
        {/* Map */}
        <div style={d.mapWrap}>
          <div style={d.mapLabel}>// LIVE MAP · NEW YORK STATE</div>
          <MapContainer center={mapCenter} zoom={7} minZoom={4} maxZoom={18} maxBounds={NY_BOUNDS} maxBoundsViscosity={1.0} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="© OpenStreetMap & CartoDB" />
            {orders.slice(0, 150).map(o => (
              <Marker key={o.id} position={[o.latitude, o.longitude]}>
                <Popup>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", padding: '4px 0', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ORDER #{o.id}</div>
                    <div>TAX: <b style={{ color: '#ff2d55' }}>${o.tax_amount.toFixed(2)}</b></div>
                    <div>TOTAL: <b style={{ color: '#1a3fff' }}>${o.total_amount.toFixed(2)}</b></div>
                    <div style={{ color: '#9a9a95', marginTop: 4, fontSize: 10 }}>{new Date(o.timestamp).toLocaleDateString()}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Table section */}
        <div style={d.tableSection}>
          {/* Filter bar */}
          <div style={d.filterBar}>
            <div style={d.filterRow}>
              <span style={d.filterLabel}>// FILTER</span>
              <select style={d.filterSelect} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">ALL STATUS</option>
                <option value="new">NEW</option>
                <option value="delivered">DELIVERED</option>
                <option value="pending">PENDING</option>
              </select>
              <input type="number" placeholder="MIN $" style={d.filterInput} value={filters.subtotal_min} onChange={e => setFilters(f => ({ ...f, subtotal_min: e.target.value }))} />
              <input type="number" placeholder="MAX $" style={d.filterInput} value={filters.subtotal_max} onChange={e => setFilters(f => ({ ...f, subtotal_max: e.target.value }))} />
              <input type="date" style={d.filterInput} value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
              <input type="date" style={d.filterInput} value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
              {filtersActive && (
                <button style={d.clearBtn} onClick={() => setFilters({ status: '', subtotal_min: '', subtotal_max: '', from: '', to: '' })}>
                  CLEAR ✕
                </button>
              )}
            </div>
            <div style={d.pageInfo}>{pagination.total} ORDERS · PAGE {pagination.page}/{pagination.totalPages}</div>
          </div>

          {/* Table */}
          <div style={d.tableWrap}>
            {loading ? (
              <div style={d.loadState}>
                <span style={d.loadSpinner} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: 2 }}>LOADING ORDERS...</span>
              </div>
            ) : orders.length === 0 ? (
              <div style={d.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⊘</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: 2, color: '#9a9a95' }}>NO ORDERS FOUND</div>
              </div>
            ) : (
              <table style={d.table}>
                <thead>
                  <tr>
                    {([
                      { label: 'ORDER ID', key: 'id' },
                      { label: 'DATE', key: 'date' },
                      { label: 'SUBTOTAL', key: 'subtotal' },
                      { label: 'TAX RATE', key: 'tax_rate' },
                      { label: 'TAX AMT', key: 'tax_amt' },
                      { label: 'TOTAL', key: 'total' },
                      { label: 'BREAKDOWN', key: null },
                      { label: 'JURISDICTIONS', key: null },
                    ] as { label: string; key: string | null }[]).map(({ label, key }) => (
                      <th key={label} style={{ ...d.th, cursor: key ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (!key) return;
                          const newSort = { by: key, dir: (sort.by === key && sort.dir === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc' };
                          setSort(newSort); loadOrders(1, newSort);
                        }}>
                        {label}{key && sort.by === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={o.id} className="order-row" style={{ background: i % 2 === 0 ? '#f5f5f0' : '#eeeee9' }}>
                      <td style={{ ...d.td, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>#{o.id}</td>
                      <td style={{ ...d.td, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#5a5a55' }}>
                        {new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </td>
                      <td style={d.td}>${o.subtotal.toFixed(2)}</td>
                      <td style={d.td}><span style={d.rateBadge}>{(o.composite_tax_rate * 100).toFixed(3)}%</span></td>
                      <td style={{ ...d.td, color: '#ff2d55', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>${o.tax_amount.toFixed(2)}</td>
                      <td style={{ ...d.td, color: '#1a3fff', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>${o.total_amount.toFixed(2)}</td>
                      <td style={d.td}>
                        {o.breakdown && (
                          <div style={d.bdGrid}>
                            <span style={{ color: '#9a9a95' }}>St</span><span>{(o.breakdown.state_rate * 100).toFixed(1)}%</span>
                            <span style={{ color: '#9a9a95' }}>Co</span><span>{(o.breakdown.county_rate * 100).toFixed(2)}%</span>
                            <span style={{ color: '#9a9a95' }}>Ci</span><span>{(o.breakdown.city_rate * 100).toFixed(1)}%</span>
                            <span style={{ color: '#9a9a95' }}>Sp</span><span>{(o.breakdown.special_rates * 100).toFixed(2)}%</span>
                          </div>
                        )}
                      </td>
                      <td style={d.td}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(o.jurisdictions || []).map(j => <span key={j} style={d.pill}>{j}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={d.pagination}>
              <button style={d.pageBtn} disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>← PREV</button>
              {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                let p: number;
                if (pagination.totalPages <= 7) p = i + 1;
                else if (pagination.page <= 4) p = i + 1;
                else if (pagination.page >= pagination.totalPages - 3) p = pagination.totalPages - 6 + i;
                else p = pagination.page - 3 + i;
                return (
                  <button key={p} style={{ ...d.pageBtn, ...(p === pagination.page ? d.pageBtnActive : {}) }} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button style={d.pageBtn} disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>NEXT →</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const d: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex', height: '100vh', background: '#f5f5f0',
    fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden', color: '#0a0a0a',
  },
  toast: {
    position: 'fixed', top: 16, right: 16, zIndex: 9999,
    padding: '12px 20px', border: '2px solid #0a0a0a', boxShadow: '4px 4px 0 #0a0a0a',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: '2px',
    animation: 'fadeIn 0.3s ease',
  },
  // SIDEBAR
  sidebar: {
    width: 260, background: '#0a0a0a', color: '#f5f5f0',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
    borderRight: '2px solid #0a0a0a',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px',
    borderBottom: '1px solid #2a2a2a',
  },
  brandIcon: {
    width: 40, height: 40, background: '#c8ff00', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  brandName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '2px', lineHeight: 1 },
  brandSub: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '1.5px', color: '#5a5a55', marginTop: 2 },
  statsSection: { padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid #2a2a2a' },
  sectionLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '2px', color: '#5a5a55', marginBottom: 4 },
  statCard: {
    border: '1px solid #2a2a2a', padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 4,
    transition: 'border-color 0.15s',
  },
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '1px', color: '#c8ff00', lineHeight: 1 },
  statLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '1.5px', color: '#5a5a55' },
  statBar: { height: 3, background: '#2a2a2a', marginTop: 6 },
  statBarFill: { height: '100%', transition: 'width 0.5s ease' },
  actionsSection: { padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid #2a2a2a' },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
    background: '#c8ff00', color: '#0a0a0a', border: '1px solid #c8ff00',
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.5px',
    cursor: 'pointer', transition: 'opacity 0.15s',
    boxShadow: '3px 3px 0 #c8ff00',
  },
  actionBtnAlt: {
    background: 'transparent', color: '#f5f5f0', border: '1px solid #2a2a2a',
    boxShadow: '3px 3px 0 #2a2a2a',
  },
  btnIcon: { fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 16, lineHeight: 1 },
  sideFooter: {
    marginTop: 'auto', padding: '20px 20px',
    display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #2a2a2a',
  },
  jurisdictionTag: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '2px',
    color: '#5a5a55', padding: '6px 0',
  },
  logoutBtn: {
    background: 'none', border: '1px solid #2a2a2a', color: '#ff2d55',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '1px',
    fontWeight: 700, cursor: 'pointer', padding: '8px 12px', textAlign: 'left',
  },
  // MAIN
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  mapWrap: { height: '40%', flexShrink: 0, position: 'relative', borderBottom: '2px solid #0a0a0a' },
  mapLabel: {
    position: 'absolute', top: 12, left: 12, zIndex: 999,
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '2px',
    background: '#0a0a0a', color: '#c8ff00', padding: '5px 10px',
  },
  tableSection: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f5f0' },
  filterBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', background: '#f5f5f0', borderBottom: '2px solid #0a0a0a',
    flexShrink: 0, gap: 8,
  },
  filterRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const },
  filterLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '2px', color: '#9a9a95', marginRight: 4 },
  filterSelect: {
    padding: '6px 10px', border: '2px solid #0a0a0a', background: '#f5f5f0',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600,
    color: '#0a0a0a', cursor: 'pointer', outline: 'none',
  },
  filterInput: {
    padding: '6px 10px', border: '2px solid #0a0a0a', background: '#f5f5f0',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: '#0a0a0a',
    outline: 'none', width: 120,
  },
  clearBtn: {
    padding: '6px 12px', border: '2px solid #ff2d55', background: '#ff2d55',
    color: '#fff', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700,
    letterSpacing: '1px', cursor: 'pointer',
  },
  pageInfo: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '1px', color: '#9a9a95', whiteSpace: 'nowrap' as const, flexShrink: 0 },
  tableWrap: { flex: 1, overflowY: 'auto' as const, overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13, minWidth: 900 },
  th: {
    padding: '10px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
    fontWeight: 700, letterSpacing: '1.5px', color: '#f5f5f0', background: '#0a0a0a',
    borderRight: '1px solid #2a2a2a', position: 'sticky' as const, top: 0,
    userSelect: 'none' as const, whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '10px 14px', borderBottom: '1px solid #e0e0db',
    verticalAlign: 'middle' as const, color: '#0a0a0a', transition: 'background 0.08s',
  },
  rateBadge: {
    background: '#ff2d55', color: '#fff', padding: '3px 8px',
    fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 11, letterSpacing: '0.5px',
    border: '1px solid #0a0a0a',
  },
  bdGrid: {
    display: 'grid', gridTemplateColumns: '18px 1fr 18px 1fr',
    gap: '2px 6px', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#0a0a0a',
  },
  pill: {
    display: 'inline-block', padding: '2px 8px', fontSize: 10, fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.5px',
    background: '#c8ff00', color: '#0a0a0a', border: '1px solid #0a0a0a',
  },
  loadState: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 60 },
  loadSpinner: {
    width: 20, height: 20, border: '2.5px solid #e0e0db', borderTopColor: '#0a0a0a',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  emptyState: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: 60 },
  pagination: {
    display: 'flex', gap: 4, padding: '10px 16px', background: '#f5f5f0',
    borderTop: '2px solid #0a0a0a', justifyContent: 'center', flexShrink: 0,
  },
  pageBtn: {
    padding: '7px 13px', border: '2px solid #0a0a0a', background: '#f5f5f0',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '1px',
    color: '#0a0a0a', cursor: 'pointer',
  },
  pageBtnActive: { background: '#0a0a0a', color: '#c8ff00' },
};

// Modal styles
const m: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10,10,10,0.7)',
    backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
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
    display: 'inline-block', padding: '4px 10px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12, fontWeight: 700, letterSpacing: '1px', border: '1px solid rgba(255,255,255,0.2)',
  },
  subtitle: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '1.5px', color: '#5a5a55' },
  closeBtn: {
    background: 'none', border: '1px solid #2a2a2a', color: '#f5f5f0',
    cursor: 'pointer', padding: '6px 10px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14, fontWeight: 700,
  },
  body: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  coordRow: { display: 'flex', gap: 12 },
  label: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '2px', color: '#5a5a55', display: 'block', marginBottom: 6 },
  input: {
    padding: '11px 14px', border: '2px solid #0a0a0a', background: '#fff',
    fontSize: 14, fontFamily: "'Space Grotesk', monospace", color: '#0a0a0a', width: '100%',
  },
  hint: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '1px',
    color: '#9a9a95', padding: '8px 12px', background: '#eeeee9', border: '1px solid #e0e0db',
  },
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
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '2px',
    textAlign: 'center',
  },
  taxGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
    background: '#eeeee9', padding: '16px', border: '1px solid #e0e0db',
  },
  taxItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  taxKey: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '1.5px', color: '#9a9a95' },
  taxVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '1px', color: '#0a0a0a' },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  pill: {
    display: 'inline-block', padding: '3px 10px', fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10, fontWeight: 700, letterSpacing: '1px', background: '#c8ff00',
    color: '#0a0a0a', border: '1px solid #0a0a0a',
  },
};
