import { Request, Response } from 'express';
import { connectDB } from '../db/database';

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
//
// Body (all required):
//   latitude, longitude   — delivery coordinates within New York State
//   subtotal              — wellness kit price before tax
//   timestamp             — order timestamp (ISO string)
//   tax_amount            — calculated tax amount
//   total_amount          — subtotal + tax_amount
//   composite_tax_rate    — combined tax rate (e.g. 0.08875)
//   breakdown             — { state_rate, county_rate, city_rate, special_rates }
//   jurisdictions         — string[] of jurisdiction names that were applied
export const createOrder = async (req: Request, res: Response) => {
  try {
    const db = await connectDB();

    const {
      latitude,
      longitude,
      subtotal,
      timestamp,
      tax_amount,
      total_amount,
      composite_tax_rate,
      breakdown,
      jurisdictions,
    } = req.body;

    // Basic validation
    if (latitude == null || longitude == null || subtotal == null) {
      res.status(400).json({ error: 'latitude, longitude and subtotal are required.' });
      return;
    }

    const result = await db.run(
      `INSERT INTO orders
        (latitude, longitude, subtotal, timestamp, tax_amount, total_amount,
         composite_tax_rate, breakdown, jurisdictions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        latitude,
        longitude,
        subtotal,
        timestamp,
        tax_amount,
        total_amount,
        composite_tax_rate,
        breakdown     ? JSON.stringify(breakdown)     : null,
        jurisdictions ? JSON.stringify(jurisdictions) : null,
      ]
    );

    res.status(201).json({
      message:  'Order created successfully.',
      orderId:  result.lastID,
    });
  } catch (error) {
    console.error('Failed to create order:', error);
    res.status(500).json({ error: 'Internal server error while creating order.' });
  }
};