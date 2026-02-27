import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// Singleton — открывается один раз, переиспользуется всеми запросами
let dbInstance: Database | null = null;

export const connectDB = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;

  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database,
  });

  // WAL улучшает параллельность при одном писателе
  await db.exec('PRAGMA journal_mode = WAL;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude           REAL    NOT NULL,
      longitude          REAL    NOT NULL,
      subtotal           REAL    NOT NULL,
      tax_amount         REAL,
      total_amount       REAL,
      composite_tax_rate REAL,
      breakdown          TEXT,
      jurisdictions      TEXT,
      timestamp          TEXT,
      customer_name      TEXT    DEFAULT 'Imported',
      status             TEXT    DEFAULT 'new',
      created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrations = [
    `ALTER TABLE orders ADD COLUMN composite_tax_rate REAL`,
    `ALTER TABLE orders ADD COLUMN breakdown TEXT`,
    `ALTER TABLE orders ADD COLUMN jurisdictions TEXT`,
  ];

  for (const sql of migrations) {
    try { await db.exec(sql); } catch { /* already exists */ }
  }

  console.log('✅ SQLite connected (singleton), orders table ready.');

  const { count } = await db.get('SELECT COUNT(*) as count FROM orders');
  if (count === 0) {
    console.log('🌱 Seeding database...');
    const seeds = [
      { lat: 40.7128, lon: -74.0060, sub: 150.00 },
      { lat: 42.3314, lon: -74.0667, sub: 89.99  },
      { lat: 43.1566, lon: -77.6088, sub: 210.50 },
      { lat: 42.8864, lon: -78.8784, sub: 45.00  },
    ];
    for (const o of seeds) {
      await db.run(
        `INSERT INTO orders (latitude, longitude, subtotal, timestamp, tax_amount, total_amount, composite_tax_rate, jurisdictions, breakdown)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.lat, o.lon, o.sub, new Date().toISOString(),
         o.sub * 0.08875, o.sub * 1.08875, 0.08875,
         JSON.stringify(['New York State', 'NYC']),
         JSON.stringify({ state_rate: 0.04, county_rate: 0.04875, city_rate: 0, special_rates: 0 })]
      );
    }
  }

  dbInstance = db;
  return dbInstance;
};
