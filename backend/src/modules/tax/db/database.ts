// Примерная логика для src/db/database.ts
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Открываем базу
export const openDb = async () => {
  return open({
    filename: './tax.db', // Файл создастся в корне
    driver: sqlite3.Database
  });
};

// Функция инициализации таблицы
export const initDb = async () => {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tax_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      taxResult REAL,
      createdAt TEXT
    )
  `);
};