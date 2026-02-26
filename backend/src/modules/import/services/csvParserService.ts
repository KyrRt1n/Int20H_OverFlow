import * as fs from 'fs';
import csv from 'csv-parser';
import { calculateTaxForLocation } from '../../tax/services/taxService';
import { connectDB } from '../../orders/db/database';

export interface ImportResult {
  processed: number;
  failed:    number;
  errors:    { row: number; reason: string }[];
}

export const processCsvFile = (filePath: string): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const promises: Promise<void>[] = [];
    const errors:   { row: number; reason: string }[] = [];
    let processed = 0;
    let rowIndex  = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const currentRow = ++rowIndex;

        const processRow = async () => {
          // --- Validate required fields ---
          const lat      = parseFloat(row.latitude);
          const lon      = parseFloat(row.longitude);
          const subtotal = parseFloat(row.subtotal);
          const timestamp: string = row.timestamp ?? new Date().toISOString();

          if (isNaN(lat) || isNaN(lon) || isNaN(subtotal)) {
            errors.push({ row: currentRow, reason: `Invalid numeric fields — lat=${row.latitude}, lon=${row.longitude}, subtotal=${row.subtotal}` });
            return;
          }

          try {
            // --- Calculate tax for delivery coordinates ---
            const tax = await calculateTaxForLocation(lat, lon, subtotal);

            // --- Persist the full order including tax breakdown ---
            const db = await connectDB();
            await db.run(
              `INSERT INTO orders
                (latitude, longitude, subtotal, timestamp,
                 tax_amount, total_amount, composite_tax_rate,
                 breakdown, jurisdictions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                lat,
                lon,
                subtotal,
                timestamp,
                tax.tax_amount,
                tax.total_amount,
                tax.composite_tax_rate,
                JSON.stringify(tax.breakdown),
                JSON.stringify(tax.jurisdictions),
              ]
            );

            processed++;
          } catch (err: any) {
            // One bad row must not abort the entire import
            errors.push({ row: currentRow, reason: err?.message ?? 'Unknown error' });
          }
        };

        promises.push(processRow());
      })
      .on('end', async () => {
        try {
          await Promise.all(promises);

          // Clean up the temp file after processing
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }

          resolve({ processed, failed: errors.length, errors });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
};