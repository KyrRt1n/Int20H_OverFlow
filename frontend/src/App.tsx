import React, { useState, useEffect, useCallback } from 'react';
import { ImportCsvModal } from './components/ImportCsvModal';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxBreakdown {
  state_rate: number;
  county_rate: number;
  city_rate: number;
  special_rates: number;
}

interface Order {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  subtotal: number;
  composite_tax_rate: number;
  tax_amount: number;
  total_amount: number;
  breakdown: TaxBreakdown;
  jurisdictions: string[];
  status?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  status: string;
  subtotal_min: string;
  subtotal_max: string;
  from: string;
  to: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const api = {
  getOrders: async (page: number, limit: number, filters: Filters) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.status)      params.set('status', filters.status);
    if (filters.subtotal_min) params.set('subtotal_min', filters.subtotal_min);
    if (filters.subtotal_max) params.set('subtotal_max', filters.subtotal_max);
    if (filters.from)        params.set('from', filters.from);
    if (filters.to)          params.set('to', filters.to);
    const res = await fetch(`/orders?${params}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json() as Promise<{ data: Order[]; pagination: Pagination }>;
  },

  createOrder: async (lat: number, lon: number, subtotal: number) => {
    const res = await fetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lon, subtotal }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create order');
    return data;
  },

  importCsv: async (file: File, token: string) => {
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

// ─── Map helpers ──────────────────────────────────────────────────────────────

function MapFitBounds({ orders }: { orders: Order[] }) {
  const map = useMap();
  useEffect(() => {
    if (orders.length > 0) {
      const bounds = L.latLngBounds(orders.map(o => [o.latitude, o.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [orders.length]);
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// ImportModal → см. ./components/ImportCsvModal.tsx

function ManualOrderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const latN = parseFloat(lat), lonN = parseFloat(lon), subN = parseFloat(subtotal);
    if (isNaN(latN) || isNaN(lonN) || isNaN(subN)) {
      setError('All fields must be valid numbers');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await api.createOrder(latN, lonN, subN);
      setResult(r);
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...styles.modalIcon, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <div>
              <div style={styles.modalTitle}>New Order</div>
              <div style={styles.modalSubtitle}>Tax is calculated automatically by coordinates</div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={styles.modalBody}>
          {!result ? (
            <>
              <div style={styles.coordRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Latitude</label>
                  <input type="number" placeholder="42.3601" value={lat}
                         onChange={e => setLat(e.target.value)} style={styles.input} step="any" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Longitude</label>
                  <input type="number" placeholder="-71.0589" value={lon}
                         onChange={e => setLon(e.target.value)} style={styles.input} step="any" />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Subtotal ($)</label>
                <input type="number" placeholder="99.99" value={subtotal}
                       onChange={e => setSubtotal(e.target.value)} style={styles.input} step="0.01" min="0" />
              </div>
              <div style={styles.hintBox}>
                <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Coordinates must be within New York State
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}
              <button
                style={{ ...styles.primaryBtn, background: 'linear-gradient(135deg, #10b981, #059669)', opacity: loading ? 0.6 : 1 }}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={styles.spinner} /> Calculating...</span> : 'Create Order'}
              </button>
            </>
          ) : (
            <div style={styles.resultBox}>
              <div style={styles.resultSuccess}>
                <svg width="32" height="32" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                </svg>
                <div style={styles.resultTitle}>Order #{result.orderId} created</div>
              </div>
              <div style={styles.taxBreakdown}>
                <div style={styles.taxRow}>
                  <span style={styles.taxLabel}>Tax Rate</span>
                  <span style={styles.taxBadge}>{(result.tax.composite_tax_rate * 100).toFixed(3)}%</span>
                </div>
                <div style={styles.taxRow}>
                  <span style={styles.taxLabel}>Tax Amount</span>
                  <span style={{ ...styles.taxValue, color: '#f43f5e' }}>${result.tax.tax_amount.toFixed(2)}</span>
                </div>
                <div style={{ ...styles.taxRow, borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
                  <span style={{ ...styles.taxLabel, fontWeight: 600, color: '#1e293b' }}>Total</span>
                  <span style={{ ...styles.taxValue, color: '#10b981', fontWeight: 700, fontSize: 18 }}>${result.tax.total_amount.toFixed(2)}</span>
                </div>
                <div style={styles.pillRow}>
                  {result.tax.jurisdictions.map((j: string) => (
                    <span key={j} style={styles.pill}>{j}</span>
                  ))}
                </div>
              </div>
              <button style={{ ...styles.primaryBtn, background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [filters, setFilters] = useState<Filters>({ status: '', subtotal_min: '', subtotal_max: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'import' | 'manual' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadOrders = useCallback(async (page = pagination.page) => {
    setLoading(true);
    try {
      const res = await api.getOrders(page, pagination.limit, filters);
      setOrders(res.data);
      setPagination(res.pagination);
    } catch {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.page]);

  useEffect(() => { loadOrders(1); }, [filters]);

  const totalTax = orders.reduce((s, o) => s + o.tax_amount, 0);
  const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const mapCenter: [number, number] = [42.7, -75.5];

  const setPage = (p: number) => {
    setPagination(prev => ({ ...prev, page: p }));
    loadOrders(p);
  };

  return (
    <div style={styles.app}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === 'success' ? '#10b981' : '#f43f5e' }}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {modal === 'import' && (
        <ImportCsvModal
          onClose={() => setModal(null)}
          onSuccess={() => { showToast('CSV imported successfully'); loadOrders(1); }}
        />
      )}
      {modal === 'manual' && (
        <ManualOrderModal
          onClose={() => setModal(null)}
          onSuccess={() => { showToast('Order created successfully'); loadOrders(1); }}
        />
      )}

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.brand}>
            <div style={styles.brandIcon}>B</div>
            <div>
              <div style={styles.brandName}>BetterMe</div>
              <div style={styles.brandTag}>Drone Delivery Tax</div>
            </div>
          </div>
        </div>

        <div style={styles.sidebarBody}>
          <div style={styles.statCard}>
            <div style={styles.statDot} />
            <div style={styles.statLabel}>Total Deliveries</div>
            <div style={styles.statValue}>{pagination.total.toLocaleString()}</div>
          </div>

          <div style={{ ...styles.statCard, ...styles.statCardRose }}>
            <div style={{ ...styles.statDecor, background: '#fff1f2' }} />
            <div style={{ ...styles.statDot, background: '#f43f5e' }} />
            <div style={styles.statLabel}>Taxes Collected</div>
            <div style={{ ...styles.statValue, color: '#e11d48' }}>
              <span style={styles.currency}>$</span>
              {totalTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={{ ...styles.statCard, ...styles.statCardGreen }}>
            <div style={{ ...styles.statDecor, background: '#ecfdf5' }} />
            <div style={{ ...styles.statDot, background: '#10b981' }} />
            <div style={styles.statLabel}>Total Revenue</div>
            <div style={{ ...styles.statValue, color: '#059669' }}>
              <span style={styles.currency}>$</span>
              {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div style={styles.actionSection}>
            <div style={styles.actionLabel}>Actions</div>
            <button style={styles.actionBtn} onClick={() => setModal('import')}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import CSV
            </button>
            <button style={{ ...styles.actionBtn, ...styles.actionBtnGreen }} onClick={() => setModal('manual')}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Manual Order
            </button>
          </div>
        </div>

        <div style={styles.sidebarFooter}>New York State Jurisdiction</div>
      </aside>

      {/* Main */}
      <main style={styles.main}>

        {/* Map */}
        <div style={styles.mapWrap}>
          <MapContainer center={mapCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="© OpenStreetMap & CartoDB" />
            <MapFitBounds orders={orders} />
            {orders.slice(0, 150).map(o => (
              <Marker key={o.id} position={[o.latitude, o.longitude]}>
                <Popup>
                  <div style={{ fontFamily: 'system-ui', padding: '2px 0' }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Order #{o.id}</div>
                    <div style={{ fontSize: 13 }}>Tax: <b style={{ color: '#e11d48' }}>${o.tax_amount.toFixed(2)}</b></div>
                    <div style={{ fontSize: 13 }}>Total: <b style={{ color: '#059669' }}>${o.total_amount.toFixed(2)}</b></div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{new Date(o.timestamp).toLocaleDateString()}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Table section */}
        <div style={styles.tableSection}>
          {/* Filters */}
          <div style={styles.filtersBar}>
            <div style={styles.filtersGroup}>
              <select style={styles.filterSelect} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="delivered">Delivered</option>
                <option value="pending">Pending</option>
              </select>
              <input type="number" placeholder="Min subtotal" style={styles.filterInput}
                     value={filters.subtotal_min} onChange={e => setFilters(f => ({ ...f, subtotal_min: e.target.value }))} />
              <input type="number" placeholder="Max subtotal" style={styles.filterInput}
                     value={filters.subtotal_max} onChange={e => setFilters(f => ({ ...f, subtotal_max: e.target.value }))} />
              <input type="date" style={styles.filterInput} value={filters.from}
                     onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
              <input type="date" style={styles.filterInput} value={filters.to}
                     onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
              {(filters.status || filters.subtotal_min || filters.subtotal_max || filters.from || filters.to) && (
                <button style={styles.clearBtn} onClick={() => setFilters({ status: '', subtotal_min: '', subtotal_max: '', from: '', to: '' })}>
                  Clear
                </button>
              )}
            </div>
            <div style={styles.paginationInfo}>
              {pagination.total} orders · Page {pagination.page} of {pagination.totalPages}
            </div>
          </div>

          {/* Table */}
          <div style={styles.tableWrap}>
            {loading ? (
              <div style={styles.loadingState}>
                <div style={styles.loadingSpinner} />
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div style={styles.emptyState}>
                <svg width="40" height="40" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="2"/>
                </svg>
                <span style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>No orders found</span>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                <tr>
                  {['Order ID', 'Date', 'Subtotal', 'Tax Rate', 'Tax Amt', 'Total', 'Breakdown', 'Jurisdictions'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {orders.map((o, i) => (
                  <tr key={o.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc')}>
                    <td style={{ ...styles.td, fontWeight: 600, color: '#334155' }}>#{o.id}</td>
                    <td style={{ ...styles.td, color: '#64748b', fontSize: 12 }}>{new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                    <td style={styles.td}>${o.subtotal.toFixed(2)}</td>
                    <td style={styles.td}><span style={styles.rateBadge}>{(o.composite_tax_rate * 100).toFixed(3)}%</span></td>
                    <td style={{ ...styles.td, color: '#e11d48', fontWeight: 700 }}>${o.tax_amount.toFixed(2)}</td>
                    <td style={{ ...styles.td, color: '#059669', fontWeight: 700 }}>${o.total_amount.toFixed(2)}</td>
                    <td style={styles.td}>
                      {o.breakdown && (
                        <div style={styles.bdGrid}>
                          <span style={{ color: '#94a3b8' }}>St</span><span>{(o.breakdown.state_rate * 100).toFixed(1)}%</span>
                          <span style={{ color: '#94a3b8' }}>Co</span><span>{(o.breakdown.county_rate * 100).toFixed(2)}%</span>
                          <span style={{ color: '#94a3b8' }}>Ci</span><span>{(o.breakdown.city_rate * 100).toFixed(1)}%</span>
                          <span style={{ color: '#94a3b8' }}>Sp</span><span>{(o.breakdown.special_rates * 100).toFixed(2)}%</span>
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(o.jurisdictions || []).map(j => (
                          <span key={j} style={styles.pill}>{j}</span>
                        ))}
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
            <div style={styles.pagination}>
              <button style={styles.pageBtn} disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>← Prev</button>
              {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                let p: number;
                if (pagination.totalPages <= 7) p = i + 1;
                else if (pagination.page <= 4) p = i + 1;
                else if (pagination.page >= pagination.totalPages - 3) p = pagination.totalPages - 6 + i;
                else p = pagination.page - 3 + i;
                return (
                  <button key={p} style={{ ...styles.pageBtn, ...(p === pagination.page ? styles.pageBtnActive : {}) }}
                          onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button style={styles.pageBtn} disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>Next →</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    height: '100vh',
    background: '#f8fafc',
    fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
    overflow: 'hidden',
  },
  toast: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    color: 'white',
    padding: '12px 20px',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    animation: 'fadeIn 0.3s ease',
  },
  // Sidebar
  sidebar: {
    width: 280,
    background: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 20px rgba(0,0,0,0.03)',
    zIndex: 20,
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: '28px 24px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  brandIcon: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 800,
    fontSize: 18,
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
    flexShrink: 0,
  },
  brandName: { fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' },
  brandTag: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  sidebarBody: { padding: '20px 16px', flex: 1, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const, gap: 12 },
  statCard: {
    background: '#fff',
    padding: '16px 18px',
    borderRadius: 14,
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    position: 'relative' as const,
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  statCardRose: {},
  statCardGreen: {},
  statDecor: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    width: 64,
    height: 64,
    borderBottomLeftRadius: 64,
    zIndex: 0,
  },
  statDot: { width: 7, height: 7, borderRadius: '50%', background: '#6366f1', marginBottom: 8, position: 'relative' as const, zIndex: 1 },
  statLabel: { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, position: 'relative' as const, zIndex: 1 },
  statValue: { fontSize: 28, fontWeight: 800, color: '#1e293b', position: 'relative' as const, zIndex: 1, lineHeight: 1 },
  currency: { fontSize: 18, marginRight: 2, opacity: 0.5 },
  actionSection: { marginTop: 4, display: 'flex', flexDirection: 'column' as const, gap: 8 },
  actionLabel: { fontSize: 11, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: 4 },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.1s',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
  },
  actionBtnGreen: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
  },
  sidebarFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #f1f5f9',
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center' as const,
  },
  // Main
  main: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  mapWrap: { height: '42%', borderBottom: '1px solid #e2e8f0', flexShrink: 0 },
  tableSection: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#f8fafc' },
  // Filters
  filtersBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    gap: 12,
    flexShrink: 0,
  },
  filtersGroup: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const },
  filterSelect: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    color: '#475569',
    background: '#f8fafc',
    outline: 'none',
    cursor: 'pointer',
  },
  filterInput: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    color: '#475569',
    background: '#f8fafc',
    outline: 'none',
    width: 130,
  },
  clearBtn: {
    padding: '6px 12px',
    border: '1px solid #fecdd3',
    borderRadius: 8,
    background: '#fff1f2',
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  paginationInfo: { fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' as const, flexShrink: 0 },
  // Table
  tableWrap: { flex: 1, overflowY: 'auto' as const, overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13, minWidth: 900 },
  th: {
    padding: '11px 16px',
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky' as const,
    top: 0,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '11px 16px',
    borderBottom: '1px solid #f1f5f9',
    color: '#475569',
    verticalAlign: 'middle' as const,
    transition: 'background 0.1s',
  },
  rateBadge: {
    background: '#fff1f2',
    color: '#e11d48',
    padding: '3px 8px',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 12,
  },
  bdGrid: {
    display: 'grid',
    gridTemplateColumns: '18px 1fr 18px 1fr',
    gap: '2px 6px',
    fontSize: 11,
    color: '#475569',
  },
  pill: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    background: '#eef2ff',
    color: '#4338ca',
    border: '1px solid #e0e7ff',
  },
  // Loading / empty
  loadingState: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60 },
  loadingSpinner: {
    width: 20,
    height: 20,
    border: '2.5px solid #e2e8f0',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: 60 },
  // Pagination
  pagination: {
    display: 'flex',
    gap: 6,
    padding: '12px 20px',
    background: '#fff',
    borderTop: '1px solid #e2e8f0',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pageBtn: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    fontSize: 13,
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.1s',
    fontWeight: 500,
  },
  pageBtnActive: {
    background: '#6366f1',
    color: '#fff',
    border: '1px solid #6366f1',
    fontWeight: 700,
  },
  // Modal
  modalOverlay: {
    position: 'fixed' as const,
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
  modalBody: { padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 16 },
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
  fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
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
    boxSizing: 'border-box' as const,
  },
  coordRow: { display: 'flex', gap: 12 },
  hintBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#94a3b8',
    background: '#f8fafc',
    padding: '8px 12px',
    borderRadius: 8,
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
  // Result
  resultBox: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  resultSuccess: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 },
  resultTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
  resultStats: { display: 'flex', justifyContent: 'center', gap: 24, padding: '16px 0', background: '#f8fafc', borderRadius: 14 },
  resultStat: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 },
  resultStatNum: { fontSize: 32, fontWeight: 800, color: '#10b981', lineHeight: 1 },
  resultStatLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  resultStatDivider: { width: 1, background: '#e2e8f0' },
  errorList: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  errorItem: { fontSize: 12, color: '#f43f5e', padding: '6px 10px', background: '#fff1f2', borderRadius: 8 },
  taxBreakdown: { background: '#f8fafc', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, gap: 10 },
  taxRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  taxLabel: { fontSize: 13, color: '#64748b' },
  taxBadge: { background: '#fff1f2', color: '#e11d48', padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 13 },
  taxValue: { fontSize: 14, fontWeight: 600 },
  pillRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 4 },
};