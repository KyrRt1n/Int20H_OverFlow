import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// Singleton instance — открывается один раз при первом вызове connectDB(),
// все последующие вызовы получают тот же объект без повторного open() и миграций.
let dbInstance: Database | null = null;

export const connectDB = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;

  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database,
  });

  // WAL-режим: улучшает параллельность чтений при одном писателе (SQLite)
  await db.exec('PRAGMA journal_mode = WAL;');

  // Создание таблицы (новая установка)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude           REAL    NOT NULL,
      longitude          REAL    NOT NULL,
      subtotal           REAL    NOT NULL,
      tax_amount         REAL,
      total_amount       REAL,
      composite_tax_rate REAL,
      breakdown          TEXT,   -- JSON: { state_rate, county_rate, city_rate, special_rates }
      jurisdictions      TEXT,   -- JSON: string[] — список применённых юрисдикций
      timestamp          TEXT,
      customer_name      TEXT    DEFAULT 'Imported',
      status             TEXT    DEFAULT 'new',
      created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Миграции — добавляем колонки, которых может не быть в старых БД.
  // SQLite не поддерживает ADD COLUMN IF NOT EXISTS, поэтому ловим ошибку.
  const migrations = [
    `ALTER TABLE orders ADD COLUMN composite_tax_rate REAL`,
    `ALTER TABLE orders ADD COLUMN breakdown TEXT`,
    `ALTER TABLE orders ADD COLUMN jurisdictions TEXT`,
  ];

  for (const sql of migrations) {
    try {
      await db.exec(sql);
    } catch {
      // Колонка уже существует — игнорируем
    }
  }

  console.log('✅ SQLite connected (singleton), orders table ready.');

  // Сид данных при первом запуске
  const { count } = await db.get('SELECT COUNT(*) as count FROM orders');
  if (count === 0) {
    console.log('🌱 Seeding database with initial data...');
    const seedOrders = [
      { lat: 40.7128, lon: -74.0060, sub: 150.00, ts: new Date().toISOString() },
      { lat: 42.3314, lon: -74.0667, sub: 89.99,  ts: new Date().toISOString() },
      { lat: 43.1566, lon: -77.6088, sub: 210.50, ts: new Date().toISOString() },
      { lat: 42.8864, lon: -78.8784, sub: 45.00,  ts: new Date().toISOString() },
    ];

    for (const order of seedOrders) {
      await db.run(
        `INSERT INTO orders
          (latitude, longitude, subtotal, timestamp, tax_amount, total_amount,
           composite_tax_rate, jurisdictions, breakdown)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.lat, order.lon, order.sub, order.ts,
          order.sub * 0.08875,
          order.sub * 1.08875,
          0.08875,
          JSON.stringify(['New York State', 'NYC']),
          JSON.stringify({ state_rate: 0.04, county_rate: 0.04875, city_rate: 0, special_rates: 0 }),
        ]
      );
    }
  }

  // Сохраняем singleton
  dbInstance = db;
  return dbInstance;
};
