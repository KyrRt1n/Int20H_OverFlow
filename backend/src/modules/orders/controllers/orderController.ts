import { Request, Response } from 'express';
import { connectDB } from '../db/database';
import { calculateTaxForLocation } from '../../tax/services/taxService';

// GET /orders
// Returns a paginated, filterable list of orders.
//
// Query params:
//   page          (default: 1)
//   limit         (default: 10)
//   from          — filter by timestamp >= value  (ISO string or YYYY-MM-DD)
//   to            — filter by timestamp <= value  (ISO string or YYYY-MM-DD)
//   subtotal_min  — filter by subtotal >= value
//   subtotal_max  — filter by subtotal <= value
//   status        — filter by exact status value  ('new', 'delivered', ...)
export const getOrders = async (req: Request, res: Response) => {
  try {
    const db = await connectDB();

    // --- Pagination ---
    const page   = parseInt(req.query.page  as string) || 1;
    const limit  = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // --- Filters ---
    const conditions: string[] = [];
    const params: any[]        = [];

    const { from, to, subtotal_min, subtotal_max, status } = req.query;

    if (from)         { conditions.push('timestamp >= ?'); params.push(from as string); }
    if (to)           { conditions.push('timestamp <= ?'); params.push(to as string); }
    if (subtotal_min) { conditions.push('subtotal >= ?');  params.push(parseFloat(subtotal_min as string)); }
    if (subtotal_max) { conditions.push('subtotal <= ?');  params.push(parseFloat(subtotal_max as string)); }
    if (status)       { conditions.push('status = ?');     params.push(status as string); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db.all(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const { total } = await db.get(
      `SELECT COUNT(*) as total FROM orders ${where}`,
      params
    );

    // Deserialize JSON columns that are stored as TEXT in SQLite
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
//   timestamp  — order timestamp (ISO string); defaults to now
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, subtotal, timestamp } = req.body;

    // Validate required fields
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

    // Auto-calculate tax based on delivery coordinates
    const tax = await calculateTaxForLocation(lat, lon, sub);

    const db = await connectDB();

    const result = await db.run(
      `INSERT INTO orders
        (latitude, longitude, subtotal, timestamp, tax_amount, total_amount,
         composite_tax_rate, breakdown, jurisdictions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lat,
        lon,
        sub,
        timestamp ?? new Date().toISOString(),
        tax.tax_amount,
        tax.total_amount,
        tax.composite_tax_rate,
        JSON.stringify(tax.breakdown),
        JSON.stringify(tax.jurisdictions),
      ]
    );

    res.status(201).json({
      message:  'Order created successfully.',
      orderId:  result.lastID,
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

    // Surface NY-bounds error as 400 instead of 500
    if (error.message?.includes('outside of New York State')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error while creating order.' });
  }
};