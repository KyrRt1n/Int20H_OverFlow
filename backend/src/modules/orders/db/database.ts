import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// Opens a connection to the SQLite database and ensures the schema is up to date.
// Also runs lightweight migrations so existing databases get the new columns.
export const connectDB = async (): Promise<Database> => {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Create table with full schema (new installs)
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
                                            jurisdictions      TEXT,   -- JSON: string[] — list of jurisdiction names that were applied
                                            timestamp          TEXT,
                                            customer_name      TEXT    DEFAULT 'Imported',
                                            status             TEXT    DEFAULT 'new',
                                            created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
      )
  `);

  // Migration: add columns that may be missing in databases created before this change.
  // SQLite does not support "ADD COLUMN IF NOT EXISTS", so we catch the error instead.
  const migrations = [
    `ALTER TABLE orders ADD COLUMN composite_tax_rate REAL`,
    `ALTER TABLE orders ADD COLUMN breakdown TEXT`,
    `ALTER TABLE orders ADD COLUMN jurisdictions TEXT`,
  ];

  for (const sql of migrations) {
    try {
      await db.exec(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  console.log('✅ SQLite database connected, orders table ready.');
  return db;
};