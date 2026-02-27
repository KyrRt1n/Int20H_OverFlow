import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as path from 'path';
import * as fs from 'fs';

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

  // Auto-seed from CSV on first launch (empty DB)
  const { count } = await db.get('SELECT COUNT(*) as count FROM orders');
  if (count === 0) {
    const csvPath = path.resolve(__dirname, '../../../../data/orders.csv');
    if (fs.existsSync(csvPath)) {
      console.log('🌱 First launch: importing seed data from orders.csv...');
      console.log('   This may take a few seconds, please wait...');
      // Lazy import to avoid circular dependency at module load time
      const { processCsvFile } = await import('../../import/services/csvParserService');
      const result = await processCsvFile(csvPath);
      console.log(`✅ Seed import complete: ${result.processed} orders imported, ${result.failed} failed.`);
    } else {
      console.log('ℹ️  No seed CSV found at backend/data/orders.csv — starting with empty database.');
    }
  }

  dbInstance = db;
  return dbInstance;
};