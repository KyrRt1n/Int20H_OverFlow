import { Request, Response } from 'express';
import { connectDB } from '../db/database';

// GET /orders (список із пагінацією + фільтрами)
// Query params:
//   page, limit          — пагінація
//   from, to             — фільтр по timestamp (ISO-рядок або YYYY-MM-DD)
//   subtotal_min,
//   subtotal_max         — фільтр по ціні wellness kit (до податку)
//   status               — фільтр по статусу замовлення ('new', 'delivered', ...)
export const getOrders = async (req: Request, res: Response) => {
  try {
    const db = await connectDB();

    // --- Пагінація ---
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // --- Фільтри ---
    const conditions: string[] = [];
    const params: any[]        = [];

    const { from, to, subtotal_min, subtotal_max, status } = req.query;

    if (from) {
      conditions.push('timestamp >= ?');
      params.push(from as string);
    }
    if (to) {
      conditions.push('timestamp <= ?');
      params.push(to as string);
    }
    if (subtotal_min) {
      conditions.push('subtotal >= ?');
      params.push(parseFloat(subtotal_min as string));
    }
    if (subtotal_max) {
      conditions.push('subtotal <= ?');
      params.push(parseFloat(subtotal_max as string));
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status as string);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Запит з фільтрами та пагінацією
    const orders = await db.all(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Загальна кількість рядків з урахуванням тих самих фільтрів
    const { total } = await db.get(
      `SELECT COUNT(*) as total FROM orders ${where}`,
      params
    );

    res.json({
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      // Відображаємо активні фільтри у відповіді — зручно для дебагу та фронтенду
      filters: { from, to, subtotal_min, subtotal_max, status }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error receiving orders' });
  }
};

// POST /orders (базовый каркас)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const db = await connectDB();
    const { latitude, longitude, subtotal, timestamp, tax_amount, total_amount } = req.body;

    // Вставляем заказ в базу данных
    const result = await db.run(
      'INSERT INTO orders (latitude, longitude, subtotal, timestamp, tax_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?)',
      [latitude, longitude, subtotal, timestamp, tax_amount, total_amount]
    );

    res.status(201).json({
      message: 'Order successfully created!',
      orderId: result.lastID,
      receivedData: req.body
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Order creation error' });
  }
};