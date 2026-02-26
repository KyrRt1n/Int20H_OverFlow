import * as fs from 'fs';
import csv from 'csv-parser';
import { calculateTaxForLocation } from '../../tax/services/taxService';
import { connectDB } from '../../orders/db/database';

export interface ImportResult {
  processed: number;
  failed:    number;
  errors:    { row: number; reason: string }[];
}

// Represents one parsed CSV row ready for processing
interface ParsedRow {
  rowIndex:  number;
  lat:       number;
  lon:       number;
  subtotal:  number;
  timestamp: string;
  raw:       { latitude: string; longitude: string; subtotal: string };
}

// Fix #6 & #7: Instead of firing all rows in parallel (SQLITE_BUSY + race conditions),
// we collect all rows first, then process them sequentially inside a single DB transaction.
// Result accumulation uses the return value of each step — no shared mutable counters.
export const processCsvFile = async (filePath: string): Promise<ImportResult> => {
  // Step 1: Parse entire CSV into memory
  const rows = await parseCsv(filePath);

  // Step 2: Open ONE db connection for the whole import
  const db = await connectDB();

  // Step 3: Process all rows sequentially inside a transaction
  const results: Array<{ ok: true } | { ok: false; row: number; reason: string }> = [];

  await db.run('BEGIN');
  try {
    for (const { rowIndex, lat, lon, subtotal, timestamp, raw } of rows) {
      if (isNaN(lat) || isNaN(lon) || isNaN(subtotal)) {
        results.push({
          ok: false,
          row: rowIndex,
          reason: `Invalid numeric fields — lat=${raw.latitude}, lon=${raw.longitude}, subtotal=${raw.subtotal}`,
        });
        continue;
      }

      try {
        const tax = await calculateTaxForLocation(lat, lon, subtotal);

        await db.run(
          `INSERT INTO orders
           (latitude, longitude, subtotal, timestamp,
            tax_amount, total_amount, composite_tax_rate,
            breakdown, jurisdictions)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lat, lon, subtotal, timestamp,
            tax.tax_amount, tax.total_amount, tax.composite_tax_rate,
            JSON.stringify(tax.breakdown),
            JSON.stringify(tax.jurisdictions),
          ]
        );

        results.push({ ok: true });
      } catch (err: any) {
        results.push({ ok: false, row: rowIndex, reason: err?.message ?? 'Unknown error' });
      }
    }

    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  } finally {
    // Clean up temp file regardless of outcome
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Step 4: Derive counts atomically from immutable results array — no shared mutable state
  const errors = results
    .filter((r): r is { ok: false; row: number; reason: string } => !r.ok)
    .map(({ row, reason }) => ({ row, reason }));

  return {
    processed: results.filter(r => r.ok).length,
    failed:    errors.length,
    errors,
  };
};

// Helper: read the entire CSV file and return parsed rows
function parseCsv(filePath: string): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const rows: ParsedRow[] = [];
    let rowIndex = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowIndex++;
        rows.push({
          rowIndex,
          lat:       parseFloat(row.latitude),
          lon:       parseFloat(row.longitude),
          subtotal:  parseFloat(row.subtotal),
          timestamp: row.timestamp ?? new Date().toISOString(),
          raw: { latitude: row.latitude, longitude: row.longitude, subtotal: row.subtotal },
        });
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}