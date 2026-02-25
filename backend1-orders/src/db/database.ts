import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// Функция для подключения к БД
export const connectDB = async (): Promise<Database> => {
  const db = await open({
    filename: './database.sqlite', // Файл БД будет создан в корне проекта
    driver: sqlite3.Database
  });

  // Скрипт создания таблицы orders
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL,
      longitude REAL,
      subtotal REAL,
      tax_amount REAL,
      total_amount REAL,
      timestamp TEXT,
      customer_name TEXT DEFAULT 'Imported',
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ База данных SQLite подключена, таблица orders готова.');
  return db
};