import { Request, Response } from 'express';
import { connectDB } from '../db/database';

// GET /orders (достать список из базы с пагинацией)
export const getOrders = async (req: Request, res: Response) => {
  try {
    const db = await connectDB();

    // Получаем параметры пагинации из query-строки (по умолчанию 1 страница, 10 элементов)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Запрашиваем данные с учетом лимита и отступа
    const orders = await db.all('SELECT * FROM orders LIMIT ? OFFSET ?', [limit, offset]);

    // Получаем общее количество записей (чтобы фронтенд знал, сколько всего страниц)
    const { total } = await db.get('SELECT COUNT(*) as total FROM orders');

    res.json({
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении заказов' });
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
      message: 'Заказ успешно создан!',
      orderId: result.lastID,
      receivedData: req.body
    });
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    res.status(500).json({ message: 'Ошибка при создании заказа' });
  }
};