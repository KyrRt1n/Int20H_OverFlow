import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { calculateTaxForLocation } from '../../tax/services/taxService';

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

  // Check if table is empty and seed it if so
  const countRes = await db.get('SELECT COUNT(*) as count FROM orders');
  if (countRes.count === 0) {
    console.log('🌱 Seeding database with initial data...');

    // Fix #12: Call calculateTaxForLocation() for each seed order
    // instead of hardcoding NYC rate 8.875% for all rows.
    const seedOrders = [
      { lat: 40.7128, lon: -74.0060, sub: 150.00, ts: new Date().toISOString() }, // NYC → 8.875%
      { lat: 42.3314, lon: -74.0667, sub: 89.99,  ts: new Date().toISOString() }, // Albany area → 8%
      { lat: 43.1566, lon: -77.6088, sub: 210.50, ts: new Date().toISOString() }, // Rochester → 8%
      { lat: 42.8864, lon: -78.8784, sub: 45.00,  ts: new Date().toISOString() }, // Buffalo (Erie) → 8.75%
    ];

    for (const order of seedOrders) {
      try {
        const tax = await calculateTaxForLocation(order.lat, order.lon, order.sub);

        await db.run(
          `INSERT INTO orders (latitude, longitude, subtotal, timestamp, tax_amount, total_amount, composite_tax_rate, jurisdictions, breakdown)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.lat,
            order.lon,
            order.sub,
            order.ts,
            tax.tax_amount,
            tax.total_amount,
            tax.composite_tax_rate,
            JSON.stringify(tax.jurisdictions),
            JSON.stringify(tax.breakdown),
          ]
        );

        console.log(`  ✓ Seeded order (${order.lat}, ${order.lon}) — rate: ${(tax.composite_tax_rate * 100).toFixed(3)}% — jurisdictions: ${tax.jurisdictions.join(', ')}`);
      } catch (err: any) {
        console.warn(`  ⚠ Seed order (${order.lat}, ${order.lon}) failed: ${err?.message}. Inserting with null tax fields.`);
        await db.run(
          `INSERT INTO orders (latitude, longitude, subtotal, timestamp, tax_amount, total_amount, composite_tax_rate, jurisdictions, breakdown)
           VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL, NULL)`,
          [order.lat, order.lon, order.sub, order.ts, order.sub]
        );
      }
    }
  }

  return db;
};