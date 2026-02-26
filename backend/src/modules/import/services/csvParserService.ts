import * as fs from 'fs';
import csv from 'csv-parser';
import { calculateTaxBatch, BatchTaxInput } from '../../tax/services/taxService';
import { connectDB } from '../../orders/db/database';

export interface ImportResult {
  processed: number;
  failed:    number;
  errors:    { row: number; reason: string }[];
}

interface ParsedRow {
  rowIndex:  number;
  lat:       number;
  lon:       number;
  subtotal:  number;
  timestamp: string;
  raw:       { latitude: string; longitude: string; subtotal: string };
}

// ---------------------------------------------------------------------------
// processCsvFile — main entry point
//
// Key change vs original:
//   Instead of calling calculateTaxForLocation() per row (11 222 separate
//   Google Maps API calls → rate-limit hell), we:
//     1. Parse the entire CSV into memory
//     2. Call calculateTaxBatch() which groups valid rows into chunks of 1 000
//        and fires them at the free Census Bureau batch geocoding endpoint
//        (3 concurrent requests → ~12 requests total for 11k rows)
//     3. Insert all results in a single SQLite transaction
//
// This brings import time from ~hours (Google, rate-limited) to ~2–3 minutes.
// ---------------------------------------------------------------------------
export const processCsvFile = async (filePath: string): Promise<ImportResult> => {
  // Step 1: Parse CSV into memory
  const rows = await parseCsv(filePath);

  // Step 2: Separate valid rows from parse errors
  const parseErrors: { row: number; reason: string }[] = [];
  const validRows: ParsedRow[] = [];

  for (const row of rows) {
    if (isNaN(row.lat) || isNaN(row.lon) || isNaN(row.subtotal)) {
      parseErrors.push({
        row:    row.rowIndex,
        reason: `Invalid numeric fields — lat=${row.raw.latitude}, lon=${row.raw.longitude}, subtotal=${row.raw.subtotal}`,
      });
    } else {
      validRows.push(row);
    }
  }

  // Step 3: Batch tax resolution (Census API)
  const batchInputs: BatchTaxInput[] = validRows.map(r => ({
    index:    r.rowIndex,
    lat:      r.lat,
    lon:      r.lon,
    subtotal: r.subtotal,
  }));

  const taxResults = await calculateTaxBatch(batchInputs);

  // Step 4: Insert results in a single DB transaction
  const db = await connectDB();
  const dbErrors: { row: number; reason: string }[] = [];

  await db.run('BEGIN');
  try {
    for (const row of validRows) {
      const tax = taxResults.get(row.rowIndex);

      if (!tax) {
        dbErrors.push({ row: row.rowIndex, reason: 'Tax calculation result missing' });
        continue;
      }

      if (!tax.ok) {
        dbErrors.push({ row: row.rowIndex, reason: tax.error });
        continue;
      }

      try {
        await db.run(
          `INSERT INTO orders
           (latitude, longitude, subtotal, timestamp,
            tax_amount, total_amount, composite_tax_rate,
            breakdown, jurisdictions)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.lat, row.lon, row.subtotal, row.timestamp,
            tax.tax_amount, tax.total_amount, tax.composite_tax_rate,
            JSON.stringify(tax.breakdown),
            JSON.stringify(tax.jurisdictions),
          ]
        );
      } catch (err: any) {
        dbErrors.push({ row: row.rowIndex, reason: err?.message ?? 'DB insert failed' });
      }
    }

    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const allErrors = [...parseErrors, ...dbErrors];

  return {
    processed: validRows.length - dbErrors.length,
    failed:    allErrors.length,
    errors:    allErrors,
  };
};

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
      .on('end',   () => resolve(rows))
      .on('error', reject);
  });
}