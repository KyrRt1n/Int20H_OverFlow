// В src/controllers/taxController.ts
import { Request, Response } from 'express';
import { openDb } from '../db/database';
// import { calculateTax } from '../services/taxService'; // Если логика расчета там

export const getTaxes = async (req: Request, res: Response) => {
  const db = await openDb();
  // Пример простой пагинации
  const items = await db.all('SELECT * FROM tax_records LIMIT 10 OFFSET 0');
  res.json(items);
};

export const createTax = async (req: Request, res: Response) => {
  const { amount } = req.body;
  // Тут вызываешь свой сервис для расчета
  // const result = calculateTax(amount);

  // И сохраняешь в БД (задача Базовика)
  const db = await openDb();
  await db.run('INSERT INTO tax_records (amount, taxResult, createdAt) VALUES (?, ?, ?)',
    [amount, 0 /*замени на результат*/, new Date().toISOString()]);

  res.status(201).json({ message: 'Saved' });
};