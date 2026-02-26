// Example logic for src/db/database.ts
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Open database
export const openDb = async () => {
  return open({
    filename: './tax.db', // File will be created in root
    driver: sqlite3.Database
  });
};

// Table initialization function
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