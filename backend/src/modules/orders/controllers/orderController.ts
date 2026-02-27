import { Request, Response } from 'express';
import { connectDB } from '../db/database';
import { calculateTaxForLocation } from '../../tax/services/taxService';

// Normalizes any date string to ISO 8601 (UTC).
// If only "YYYY-MM-DD" is passed, it appends "T00:00:00.000Z".
// Returns null if the string cannot be parsed.
function normalizeToISO(value: string): string | null {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString(); // always "YYYY-MM-DDTHH:mm:ss.sssZ"
}

// GET /orders
// Returns a paginated, filterable list of orders.
//
// Query params:
//   page          (default: 1)
//   limit         (default: 10, max: 200)
//   from          — filter by timestamp >= value  (ISO string or YYYY-MM-DD)
//   to            — filter by timestamp <= value  (ISO string or YYYY-MM-DD)
//   subtotal_min  — filter by subtotal >= value
//   subtotal_max  — filter by subtotal <= value
//   status        — filter by exact status value  ('new', 'delivered', ...)
export const getOrders = async (req: Request, res: Response) => {
  try {
    const db = await connectDB();

    // --- Pagination ---
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    // --- Filters ---
    const conditions: string[] = [];
    const params: any[]        = [];

    const { from, to, subtotal_min, subtotal_max, status, sort_by, sort_dir } = req.query;

    // Whitelist sortable columns to prevent SQL injection
    const SORTABLE = { id: 'id', date: 'timestamp', subtotal: 'subtotal', tax_rate: 'composite_tax_rate', tax_amt: 'tax_amount', total: 'total_amount' } as Record<string, string>;
    const orderCol = SORTABLE[sort_by as string] ?? 'timestamp';
    const orderDir = (sort_dir as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Normalize from/to filters to ISO and compare with the timestamp column.
    // Sorting is also by timestamp — keeping semantics unified.
    if (from) {
      const iso = normalizeToISO(from as string);
      if (!iso) {
        res.status(400).json({ error: `Invalid 'from' date: "${from}"` });
        return;
      }
      // For "start of day" filter — if only date is passed, 'from' is already normalized to T00:00:00Z
      conditions.push('timestamp >= ?');
      params.push(iso);
    }

    if (to) {
      const iso = normalizeToISO(to as string);
      if (!iso) {
        res.status(400).json({ error: `Invalid 'to' date: "${to}"` });
        return;
      }
      // If only date (YYYY-MM-DD) is passed, normalize to the end of day T23:59:59.999Z
      const raw = to as string;
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
      const isoTo = isDateOnly
        ? new Date(new Date(iso).setUTCHours(23, 59, 59, 999)).toISOString()
        : iso;
      conditions.push('timestamp <= ?');
      params.push(isoTo);
    }

    if (subtotal_min) { conditions.push('subtotal >= ?');  params.push(parseFloat(subtotal_min as string)); }
    if (subtotal_max) { conditions.push('subtotal <= ?');  params.push(parseFloat(subtotal_max as string)); }
    if (status)       { conditions.push('status = ?');     params.push(status as string); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting by timestamp — the same column used for filtering
    const rows = await db.all(
      `SELECT * FROM orders ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const { total } = await db.get(
      `SELECT COUNT(*) as total FROM orders ${where}`,
      params
    );

    // Global totals across ALL orders (ignoring pagination/filters) — for sidebar stats
    const globalStats = await db.get(
      `SELECT COUNT(*) as total_orders, SUM(tax_amount) as total_tax, SUM(total_amount) as total_revenue FROM orders`
    );

    // Deserialize JSON columns
    const orders = rows.map((row: any) => ({
      ...row,
      breakdown:     row.breakdown     ? JSON.parse(row.breakdown)     : null,
      jurisdictions: row.jurisdictions ? JSON.parse(row.jurisdictions) : [],
    }));

    res.json({
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total_orders:  globalStats.total_orders  ?? 0,
        total_tax:     globalStats.total_tax     ?? 0,
        total_revenue: globalStats.total_revenue ?? 0,
      },
      filters: { from, to, subtotal_min, subtotal_max, status },
    });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Internal server error while fetching orders.' });
  }
};

// POST /orders
// Creates a single order manually.
// Tax is calculated automatically based on delivery coordinates.
//
// Body (required):
//   latitude   — delivery coordinate (within New York State)
//   longitude  — delivery coordinate (within New York State)
//   subtotal   — wellness kit price before tax
//
// Body (optional):
//   timestamp  — order timestamp; normalizes to ISO 8601, defaults to now
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, subtotal, timestamp } = req.body;

    // Mandatory fields validation
    if (latitude == null || longitude == null || subtotal == null) {
      res.status(400).json({ error: 'latitude, longitude and subtotal are required.' });
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const sub = parseFloat(subtotal);

    if (isNaN(lat) || isNaN(lon) || isNaN(sub)) {
      res.status(400).json({ error: 'latitude, longitude and subtotal must be valid numbers.' });
      return;
    }

    // Normalize timestamp to ISO: default to now if not provided
    let normalizedTimestamp: string;
    if (timestamp) {
      const iso = normalizeToISO(timestamp);
      if (!iso) {
        res.status(400).json({ error: `Invalid timestamp: "${timestamp}"` });
        return;
      }
      normalizedTimestamp = iso;
    } else {
      normalizedTimestamp = new Date().toISOString();
    }

    const tax = await calculateTaxForLocation(lat, lon, sub);
    const db  = await connectDB();

    const result = await db.run(
      `INSERT INTO orders
        (latitude, longitude, subtotal, timestamp, tax_amount, total_amount,
         composite_tax_rate, breakdown, jurisdictions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lat,
        lon,
        sub,
        normalizedTimestamp,
        tax.tax_amount,
        tax.total_amount,
        tax.composite_tax_rate,
        JSON.stringify(tax.breakdown),
        JSON.stringify(tax.jurisdictions),
      ]
    );

    res.status(201).json({
      message: 'Order created successfully.',
      orderId: result.lastID,
      tax: {
        composite_tax_rate: tax.composite_tax_rate,
        tax_amount:         tax.tax_amount,
        total_amount:       tax.total_amount,
        breakdown:          tax.breakdown,
        jurisdictions:      tax.jurisdictions,
      },
    });
  } catch (error: any) {
    console.error('Failed to create order:', error);

    if (error.message?.includes('outside of New York State')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error while creating order.' });
  }
};