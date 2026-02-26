// All requests go to the same origin — in dev, Vite proxies /orders and /tax to localhost:3000.
// In production, the backend serves the built frontend directly.

export const apiClient = {
  getOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    subtotal_min?: number;
    subtotal_max?: number;
    from?: string;
    to?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page)         query.set('page',         String(params.page));
    if (params?.limit)        query.set('limit',        String(params.limit));
    if (params?.status)       query.set('status',       params.status);
    if (params?.subtotal_min) query.set('subtotal_min', String(params.subtotal_min));
    if (params?.subtotal_max) query.set('subtotal_max', String(params.subtotal_max));
    if (params?.from)         query.set('from',         params.from);
    if (params?.to)           query.set('to',           params.to);

    const res = await fetch(`/orders?${query}`);
    if (!res.ok) throw new Error(`getOrders failed: ${res.status}`);
    return res.json();
  },

  createOrder: async (order: { latitude: number; longitude: number; subtotal: number; timestamp?: string }) => {
    const res = await fetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `createOrder failed: ${res.status}`);
    return data;
  },

  importCsv: async (file: File, token: string) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/orders/import', {
      method: 'POST',
      headers: { Authorization: token },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `importCsv failed: ${res.status}`);
    return data;
  },
};
